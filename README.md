![image](https://github.com/ChrisvanChip/flowsavvy-linear/assets/31969757/13ff3ab7-45b5-4019-bfc2-8e750d57eb22)

## The Story
Recently, I discovered [FlowSavvy](https://flowsavvy.app), an automatic time-blocking tool. It schedules your tasks neatly around your events, ensuring a balanced workload, which works great!

However, creating tasks felt sluggish. I already use Linear for solo development, so after 0 days of using FlowSavvy (really 🙈), I created an integration to lift this burden. If you are assigned to a Linear issue, FlowSavvy will automatically schedule it in the best spot in your schedule. Now, you've automated the automator!

This is also my first dive into TypeScript! I've always postponed trying it out, but I'm sure it saved me from debugging hundreds of weird bugs with JS 😅

## How it works
This integration uses Linear's Webhook feature. It hosts a Node.js Express server, which receives the payload sent by Linear, verifies the hash, and communicates the appropriate action with FlowSavvy.

![Flowchart](https://github.com/ChrisvanChip/flowsavvy-linear/assets/31969757/97e6ea07-0122-4b83-a0a6-d360404bacf2)

## Installation
1. Deploy [this GitHub project](https://github.com/ChrisvanChip/flowsavvy-linear) to a platform of your choice. I use self-hosted Coolify with nixpacks.
2. Take note of your application domain.
3. Head to Linear, press the team selector and open **Workspace Settings**
4. Under **API**, click on **Create new webhook**. Give it a label, enter your application domain and copy the signing secret.
5. Click **Create webhook** and head back to your hosting platform.
6. Copy over the environment variables from example.env, all of them are required to run.
7. Run `npm run start` or **Deploy** and you should be good to go! 🎉
