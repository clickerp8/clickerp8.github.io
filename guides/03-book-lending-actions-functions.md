# Actions and Functions in SAP CAP: Build a Book Lending App

CAP gives every entity create, read, update and delete for free. But real businesses don't think that way. They think in verbs: a member **borrows** a book, a member **returns** it.

In this guide, we build a small library app and add our own business operations to it. We add two **actions** that change data, and two **functions** that only read data. Then we turn the actions into buttons in a Fiori screen.

You can follow it with no SAP or coding background. Every new word gets a one-line explanation.

Prefer to watch? The full video walkthrough is here: [clickERP on YouTube](https://www.youtube.com/@clickERP)

## The use case

A small library lends books to its members. They want one app with these rules:

1. A member borrows a book with their email. The book is due back in 14 days.
2. A member can't borrow a book when all its copies are already on loan.
3. A member returns a book, and the app records the return date.
4. A librarian can ask how many copies of a book are on the shelf right now.
5. A librarian can ask which loans are overdue.

We build that app in this guide.

## Words you need first

- **CRUD:** the four basic operations CAP gives you for free: Create, Read, Update and Delete.
- **Action:** your own operation that **changes data**, like borrowing a book. It's called with POST.
- **Function:** your own operation that **only reads data** and changes nothing, like counting copies. It's called with GET.
- **Bound:** the operation belongs to **one record**, like one specific book.
- **Unbound:** the operation belongs to the **whole service**, not to one record.
- **Handler:** the JavaScript code that runs when someone calls the operation.

The rule of thumb: if the verb sounds like "do", it's an action. If it sounds like "tell me", it's a function.

| | Bound (one record) | Unbound (whole service) |
| --- | --- | --- |
| **Action** (changes data) | `borrow` this book, `returnBook` this loan | |
| **Function** (reads data) | `availableCopies` of this book | `overdueLoans` in the library |

## Before you start

You need an **SAP BTP trial account** and **SAP Business Application Studio (BAS)**. If you don't have them yet, follow [Set Up Your Free SAP BTP Trial](00-btp-trial-setup.html) first.

In BAS, open your dev space of type *Full Stack Cloud Application*.

## Step 1: Create the project

Open a terminal in BAS. First, create the project:

```bash
cds init cap-book-lending --nodejs
```

Then go into the new project folder:

```bash
cd cap-book-lending
```

Then start the app:

```bash
cds watch
```

`cds watch` starts the app and restarts it every time you save a file. It says "no models found" for now. Keep it running.

## Step 2: Describe the data

In the `db` folder, create a file called `schema.cds`:

```cds
namespace library;

using { cuid, managed } from '@sap/cds/common';

// A book on the library shelf
entity Books : cuid, managed {
  title  : String(111) @mandatory;
  author : String(111);
  genre  : String(30);
  copies : Integer default 1;   // total copies the library owns
  loans  : Association to many Loans on loans.book = $self;
}

// A person who can borrow books
entity Members : cuid, managed {
  name  : String(100) @mandatory;
  email : String(100) @mandatory;
  loans : Association to many Loans on loans.member = $self;
}

// One book borrowed by one member
entity Loans : cuid, managed {
  book       : Association to Books;
  member     : Association to Members;
  loanDate   : Date;
  dueDate    : Date;
  returnDate : Date;
  status     : String(10) enum { Active; Returned } default 'Active';
}
```

Here's what's new since Guide 1.

- A **Loan** links one book to one member. So a book can have many loans over time, and so can a member.
- `copies` is how many copies the library **owns**. The copies on the shelf are the copies owned, minus the active loans. We work that out in code.
- An **enum** is a fixed list of allowed values. A loan's `status` can only be `Active` or `Returned`.

## Step 3: Add sample data

In `db`, create a folder called `data`. Add these three files. Each name is the namespace, a dash, then the entity name.

`library-Books.csv`:

```csv
ID;title;author;genre;copies
b0000000-0000-4000-8000-000000000001;Clean Code;Robert C. Martin;Software;2
b0000000-0000-4000-8000-000000000002;The Pragmatic Programmer;Andrew Hunt;Software;3
b0000000-0000-4000-8000-000000000003;Atomic Habits;James Clear;Self-help;1
b0000000-0000-4000-8000-000000000004;Deep Work;Cal Newport;Self-help;2
b0000000-0000-4000-8000-000000000005;Sapiens;Yuval Noah Harari;History;1
b0000000-0000-4000-8000-000000000006;The Alchemist;Paulo Coelho;Fiction;2
b0000000-0000-4000-8000-000000000007;1984;George Orwell;Fiction;1
b0000000-0000-4000-8000-000000000008;Thinking, Fast and Slow;Daniel Kahneman;Psychology;1
b0000000-0000-4000-8000-000000000009;Zero to One;Peter Thiel;Business;2
b0000000-0000-4000-8000-000000000010;The Lean Startup;Eric Ries;Business;1
```

`library-Members.csv`:

```csv
ID;name;email
a0000000-0000-4000-8000-000000000001;Anita Rao;anita@example.com
a0000000-0000-4000-8000-000000000002;Ben Carter;ben@example.com
a0000000-0000-4000-8000-000000000003;Chen Wei;chen@example.com
```

`library-Loans.csv`:

```csv
ID;book_ID;member_ID;loanDate;dueDate;returnDate;status
c0000000-0000-4000-8000-000000000001;b0000000-0000-4000-8000-000000000003;a0000000-0000-4000-8000-000000000001;2026-09-01;2026-09-15;;Active
c0000000-0000-4000-8000-000000000002;b0000000-0000-4000-8000-000000000001;a0000000-0000-4000-8000-000000000002;2026-10-05;2026-10-19;;Active
c0000000-0000-4000-8000-000000000003;b0000000-0000-4000-8000-000000000006;a0000000-0000-4000-8000-000000000003;2026-08-10;2026-08-24;2026-08-20;Returned
```

Notice two things in the loans. Anita has the only copy of *Atomic Habits*. And her loan was due on Sept 15, so it's overdue. We use both later.

## Step 4: Declare the actions and functions

In the `srv` folder, create a file called `library-service.cds`:

```cds
using library from '../db/schema';

service LibraryService {

  entity Books as projection on library.Books actions {
    // Action: changes data. A member borrows this book.
    action   borrow(email : String) returns Loans;
    // Function: only reads. How many copies are on the shelf right now?
    function availableCopies()       returns Integer;
  };

  entity Members as projection on library.Members;

  entity Loans as projection on library.Loans actions {
    // Action: the member brings the book back
    action returnBook() returns Loans;
  };

  // Unbound function: works on the whole service, not on one book
  function overdueLoans() returns many Loans;
}
```

**Declaring** means telling CAP the name, the input and the output. There's no logic yet. Read each line like a sentence:

- `action borrow(email : String) returns Loans`: "borrow takes an email and gives back a loan."
- `function availableCopies() returns Integer`: "availableCopies takes nothing and gives back a number."
- Operations inside `actions { }` after an entity are **bound** to one record of it.
- `overdueLoans` sits directly in the service, so it's **unbound**.
- `returns many Loans` means a **list** of loans.

Save. The operations now appear in the service, but calling them gives an error, because nobody has said what they should do yet.

## Step 5: Write the logic in a handler

In `srv`, create a file called `library-service.js`. It has the same name as `library-service.cds`, so CAP connects them automatically.

```js
import cds from '@sap/cds'

export default class LibraryService extends cds.ApplicationService { init() {

  console.log('📚 LibraryService is starting: registering our handlers')

  const { Books, Members, Loans } = this.entities
  const today = () => new Date().toISOString().slice(0, 10)

  // Copies on the shelf = copies owned minus active loans
  const copiesLeft = async (book) => {
    const { count } = await SELECT.one`count(*) as count`.from(Loans).where({ book_ID: book.ID, status: 'Active' })
    console.log(`   ↳ "${book.title}": ${book.copies} copies owned, ${count} on loan → ${book.copies - count} left`)
    return book.copies - count
  }

  // Function: availableCopies() on one book
  this.on('availableCopies', Books, async (req) => {
    console.log('\n🔎 FUNCTION availableCopies() called (GET, only reads)')
    const book = await SELECT.one.from(req.subject)
    console.log(`   1. Found the book from the URL: "${book.title}"`)
    const left = await copiesLeft(book)
    console.log(`   2. Sending back: ${left}`)
    return left
  })

  // Action: borrow(email) on one book
  this.on('borrow', Books, async (req) => {
    console.log('\n📖 ACTION borrow() called (POST, changes data)')
    console.log('   Input from the request body (req.data):', req.data)

    const book = await SELECT.one.from(req.subject)
    console.log(`   1. Found the book from the URL (req.subject): "${book.title}"`)

    const member = await SELECT.one.from(Members).where({ email: req.data.email })
    if (!member) {
      console.log(`   ✗ No member with email ${req.data.email} → sending error 404`)
      return req.error(404, `No member with email ${req.data.email}`)
    }
    console.log(`   2. Found the member: ${member.name}`)

    if (await copiesLeft(book) <= 0) {
      console.log('   ✗ No copies left → sending error 409')
      return req.error(409, `Sorry, all copies of "${book.title}" are on loan`)
    }
    console.log('   3. A copy is available')

    const due = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const loan = { ID: cds.utils.uuid(), book_ID: book.ID, member_ID: member.ID, loanDate: today(), dueDate: due }
    await INSERT.into(Loans).entries(loan)
    console.log(`   4. Created a new loan, due back on ${due}`)

    console.log('   5. Sending back the new loan ✓')
    return SELECT.one.from(Loans, loan.ID)
  })

  // Action: returnBook() on one loan
  this.on('returnBook', Loans, async (req) => {
    console.log('\n↩️  ACTION returnBook() called (POST, changes data)')
    const loan = await SELECT.one.from(req.subject)
    console.log(`   1. Found the loan from the URL, status: ${loan.status}`)

    if (loan.status === 'Returned') {
      console.log('   ✗ Already returned → sending error 409')
      return req.error(409, 'This book was already returned')
    }

    await UPDATE(req.subject).with({ status: 'Returned', returnDate: today() })
    console.log(`   2. Set status to Returned, return date ${today()}`)

    console.log('   3. Sending back the updated loan ✓')
    return SELECT.one.from(req.subject)
  })

  // Unbound function: overdueLoans()
  this.on('overdueLoans', async () => {
    console.log('\n⏰ UNBOUND FUNCTION overdueLoans() called (GET, no book in the URL)')
    const overdue = await SELECT.from(Loans).where`status = 'Active' and dueDate < ${today()}`
    console.log(`   1. Found ${overdue.length} active loan(s) due before ${today()}`)
    console.log('   2. Sending back the list ✓')
    return overdue
  })

  console.log('📚 LibraryService is ready: borrow, returnBook, availableCopies, overdueLoans')
  return super.init()
}}
```

What each piece means:

| Code | Meaning |
| --- | --- |
| `this.on('borrow', Books, ...)` | "When someone calls **borrow** on **Books**, run this code." |
| `req.data` | The input. `req.data.email` is the email that was sent. |
| `req.subject` | The record the bound operation was called on, like this exact book. |
| `req.error(409, '...')` | Stop, and send an error message back to the caller. |
| `return ...` | What you return is what the caller gets. It must match `returns` in the CDS file. |
| `return super.init()` | Always the last line. It finishes the setup. Forget it and nothing works. |

For the unbound `overdueLoans`, we leave out the entity in `this.on(...)`, because there's no single record.

## Step 6: Call them with test.http

In the project folder, create a file called `test.http`:

```http
@server = http://localhost:4004
@svc = {{server}}/odata/v4/library

### All books
GET {{svc}}/Books

### All loans, with the book title and member name
GET {{svc}}/Loans?$expand=book($select=title),member($select=name)

### Function: copies left of "Atomic Habits" (1 copy, already on loan → 0)
GET {{svc}}/Books(b0000000-0000-4000-8000-000000000003)/LibraryService.availableCopies()

### Action: Chen borrows "The Pragmatic Programmer"
POST {{svc}}/Books(b0000000-0000-4000-8000-000000000002)/LibraryService.borrow
Content-Type: application/json

{ "email": "chen@example.com" }

### Action: borrow "Atomic Habits" → 409, no copies left
POST {{svc}}/Books(b0000000-0000-4000-8000-000000000003)/LibraryService.borrow
Content-Type: application/json

{ "email": "ben@example.com" }

### Action: Anita returns "Atomic Habits"
POST {{svc}}/Loans(c0000000-0000-4000-8000-000000000001)/LibraryService.returnBook
Content-Type: application/json

{}

### Unbound function: all overdue loans
GET {{svc}}/overdueLoans()
```

Click **Send Request** above each block, from top to bottom. Here's what you should see:

| Request | Result |
| --- | --- |
| availableCopies of *Atomic Habits* | `"value": 0` |
| Chen borrows *The Pragmatic Programmer* | A new loan, with a due date 14 days from today |
| Ben borrows *Atomic Habits* | Error 409: Sorry, all copies of "Atomic Habits" are on loan |
| Anita returns *Atomic Habits* | The loan, now with status `Returned` and today's return date |
| overdueLoans | The loans that are still active and past their due date |

Send the "Anita returns" request a second time. You get error 409: This book was already returned. Your business rule protects the data.

Watch the terminal too. The `console.log` lines show each step inside every action and function.

### How to read the URLs

```
/odata/v4/library / Books(<key>) / LibraryService.borrow
   the service       which record   service name + operation
```

- A **bound** operation has the record key in the URL, and the service name in front of the operation name.
- A **function** always ends with brackets `()`, even with no input.
- An **action** uses POST and needs `Content-Type: application/json`, even with an empty body `{}`.

## Step 7: Add Borrow and Return buttons in Fiori

In the `app` folder, create a file called `annotations.cds`:

```cds
using LibraryService from '../srv/library-service';

// Columns and buttons for the Fiori preview
annotate LibraryService.Books with @(UI.LineItem: [
  { Value: title,  Label: 'Title' },
  { Value: author, Label: 'Author' },
  { Value: genre,  Label: 'Genre' },
  { Value: copies, Label: 'Copies' },
  { $Type: 'UI.DataFieldForAction', Action: 'LibraryService.borrow', Label: 'Borrow' }
]);

annotate LibraryService.Loans with @(UI.LineItem: [
  { Value: book.title,  Label: 'Book' },
  { Value: member.name, Label: 'Member' },
  { Value: loanDate,    Label: 'Loan date' },
  { Value: dueDate,     Label: 'Due date' },
  { Value: status,      Label: 'Status' },
  { $Type: 'UI.DataFieldForAction', Action: 'LibraryService.returnBook', Label: 'Return' }
]);

annotate LibraryService.Members with @(UI.LineItem: [
  { Value: name,  Label: 'Name' },
  { Value: email, Label: 'Email' }
]);
```

`UI.DataFieldForAction` turns an action into a button above the table.

Open the welcome page for port 4004. Next to **Books**, click **Fiori preview**. Select a book and click **Borrow**. Fiori asks for the email by itself, because the action has an `email` parameter. You write no UI code.

Try borrowing *Atomic Habits* again. Your 409 message appears as a pop-up.

## Why not just use PATCH?

You could "return" a book by sending a PATCH that sets `status` to `Returned`. So why build an action?

| With PATCH | With an action |
| --- | --- |
| The caller must know which fields to change | The caller just says "returnBook" |
| Anyone can set any status | The rules live in one place, on the server |
| The return date is easy to forget | The action always sets the return date |

Actions protect your business rules. The caller says **what** should happen, and your service decides **how**.

## Common mistakes

- Calling a function with POST, or an action with GET: you get 405 Method Not Allowed.
- Forgetting `Content-Type: application/json` on an action: you get 415 Unsupported Media Type.
- Missing `return super.init()`: nothing works.
- Handler file named differently from the `.cds` file: `library-service.cds` needs `library-service.js`.
- An action with the same name as a field: you get a compile error. Give them different names.
- Forgetting the brackets `()` at the end of a function URL. CAP may forgive it, but the OData standard needs them.

## Your challenge

Add an unbound function `topBooks(limit : Integer) returns many Books`, which returns the most borrowed books. Call it with `GET {{svc}}/topBooks(limit=3)`. Try it, then share how it went in the video's comments.

## What's next

You added your own business operations to CAP, with rules that refuse bad requests, and buttons in Fiori with no UI code.

Watch me build it step by step on YouTube: [clickERP on YouTube](https://www.youtube.com/@clickERP)

Next guide: Webinar Registration, with event handlers that check and change data automatically.
