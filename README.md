# Welcome to your Lovable project

## Project info

**URL**: <https://lovable.dev/projects/3dea3dd3-5e4c-4653-8243-7301dd3f0830>

## How can I edit this code?

There are several ways of editing your application.

### Use Lovable

Simply visit the [Lovable Project](https://lovable.dev/projects/3dea3dd3-5e4c-4653-8243-7301dd3f0830) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

### Use your preferred IDE

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

### Edit a file directly in GitHub

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

### Use GitHub Codespaces

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/3dea3dd3-5e4c-4653-8243-7301dd3f0830) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Environment configuration

Create a `.env.local` file (or update your existing environment file) with the following keys:

```ini
# Airtable access
VITE_AIRTABLE_PAT=your_airtable_pat
VITE_AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
VITE_AIRTABLE_INVENTORY_TABLE_ID=tblXXXXXXXXXXXXXX
VITE_AIRTABLE_POINT_OF_PRESENCE_TABLE_ID=tblXXXXXXXXXXXXXX
VITE_AIRTABLE_BUSINESS_LINES_TABLE_ID=tblXXXXXXXXXXXXXX
VITE_AIRTABLE_ORDERS_TABLE_ID=tblXXXXXXXXXXXXXX

# n8n webhooks that replace the legacy Power Automate flows
VITE_N8N_SUBMIT_ORDER_WEBHOOK_URL=https://your-n8n-host/webhook/submit-order
VITE_N8N_ORDER_PLACED_WEBHOOK_URL=https://your-n8n-host/webhook/order-placed
```

- `VITE_N8N_SUBMIT_ORDER_WEBHOOK_URL` is invoked once per cart item and receives the order-line data (category, nature, quantity, etc.).
- `VITE_N8N_ORDER_PLACED_WEBHOOK_URL` triggers after all line items have been processed and receives the overall order summary (order ID, delivery party, item counts).

Both endpoints should accept `POST` requests with a JSON payload. Configure your n8n workflows to match the expected contract.
