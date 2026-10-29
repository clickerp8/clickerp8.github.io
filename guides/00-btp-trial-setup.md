# Set Up Your Free SAP BTP Trial

Before you build anything in SAP CAP, you need two free tools. This guide sets up both, step by step.

You don't need a credit card. You don't need to install anything on your computer. Everything runs in your browser.

## Two words first

- **SAP BTP:** SAP's cloud platform. It's the place where you build and run your own apps, right next to SAP.
- **SAP Business Application Studio (BAS):** SAP's online code editor. You write your CAP app here, inside your browser.

A **trial account** is a free BTP account for learning. It has everything you need for this course.

## Step 1: Create your SAP account

1. Open the SAP BTP trial page: [https://www.sap.com/products/technology-platform/trial.html](https://www.sap.com/products/technology-platform/trial.html)
2. Click **Start your free trial**.
3. Fill in your name, email and country, and accept the terms.
4. Open the email from SAP and click the link to activate your account.
5. Set a password.

**Tip:** use an email you check often. SAP sends trial reminders there.

## Step 2: Create your trial account

1. Log in at [https://account.hanatrial.ondemand.com](https://account.hanatrial.ondemand.com) with your new SAP account.
2. SAP asks you to pick a **region**. A region is the data centre where your trial runs. Pick one that is close to you, if it's on the list.
3. Wait one or two minutes while SAP sets everything up.
4. When you see **Go To Your Trial Account**, click it.

You are now in the **BTP cockpit**. The cockpit is the web page where you manage everything in your BTP account.

## Step 3: Open Business Application Studio

1. On the trial home page, find the **Quick Tool Access** section.
2. Click **SAP Business Application Studio**.
3. If SAP asks you to log in again, use the same SAP account.

The first time, it can take a minute to open. That's normal.

## Step 4: Create your dev space

A **dev space** is your own small computer in the cloud, with all the CAP tools already installed.

1. Click **Create Dev Space**.
2. Give it a name, for example `cap`. Use letters and numbers only.
3. Choose the type **Full Stack Cloud Application**.
4. Click **Create Dev Space**.
5. Wait until the status changes to **RUNNING**. This takes one to three minutes.
6. Click the name of your dev space to open it.

You now see a code editor in your browser. You're ready to build.

## Step 5: Check that CAP works

1. In BAS, open the menu (☰) and choose **Terminal → New Terminal**.
2. Type this command and press Enter:

```
cds --version
```

3. You should see a list of version numbers. That means CAP is installed and working.

## Common problems

- **"No region available" or the setup hangs:** log out, wait a few minutes and try again. Trial setup is sometimes slow.
- **The dev space is STOPPED:** BAS stops your dev space when you don't use it for a while. Click the play button next to it to start it again. Your files are still there.
- **The trial has expired:** trial accounts don't last forever. The cockpit shows how many days you have left, and SAP emails you before it ends. Check the cockpit for the option to extend.

## What's next

Your tools are ready. Now build your first app:
[Build Your First SAP CAP App from Zero](01-first-sales-order.html)

Want to build it live with an instructor? [Request live training](https://forms.gle/ovT9EgQquL5ERW2c6)
