<a href="https://www.tissues.dev">
  <img alt="Tissues.Dev" src="./public/og-image.png">
  <h1 align="center">Tissues.Dev</h1>
</a>

<p align="center">
  An open source wireframe to app generator. Powered by MOS LLM.
</p>

## Tech stack

- [Kimi K2.5](https://togetherai.link/) for the LLM
- [Together AI](https://togetherai.link/) for LLM inference
- [Sandpack](https://sandpack.codesandbox.io/) for the code sandbox
- Browser localStorage for local testing and persistence
- [Vercel Blob](https://vercel.com/docs/vercel-blob) for production image storage
- Next.js app router with Tailwind
- Helicone for observability
- Plausible for website analytics

## Cloning & running

1. Clone the repo: `git clone https://github.com/Nutlope/napkins`
2. Create a `.env` file and add your [Together AI API key](https://togetherai.link/llama3.2vision/?utm_source=example-app&utm_medium=napkins&utm_campaign=napkins-app-signup): `TOGETHER_API_KEY=`
3. Run `npm install` and `npm run dev` to install dependencies and run locally.
4. For local testing, upload a file or use the built-in demo image. The app stores the image and generated output in the browser so refreshes do not clear your test state.
5. For production uploads on Vercel, create a Blob store in the project Storage tab. Vercel will add `BLOB_READ_WRITE_TOKEN` automatically; for local runs you can pull it with `vercel env pull`.

## Future Tasks

- [ ] Make sure it looks nicer and less cluttered on mobile
- [ ] On the sidebar, show the output from the vision model
- [ ] Experiment with making it better through few shot prompts
- [ ] Add a shadcn toggle to allow folks to use or not use it
- [ ] Allow folks to edit the generated app with a prompt
- [ ] Allow folks to choose from different themes
- [ ] Show versions as the user edits the app
