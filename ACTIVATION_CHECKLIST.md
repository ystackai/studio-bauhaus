# Bauhaus Digital Activation Checklist

This studio is scaffolded locally, but it is not automatically live. Use this checklist so we do not repeat the same setup mistakes.

## Git + GitHub

- [ ] Initialize git in `studio-bauhaus` if it is not already a repo.
- [ ] Create the GitHub repo `ystackai/studio-bauhaus` and push `main`.
- [ ] Create a GitHub Project board for `ystackai/studio-bauhaus` if this studio should use the GitHub board workflow.
- [ ] Confirm `studio.json` still matches reality: slug `bauhaus`, repo `studio-bauhaus`, visibility, links, and branding.

## Discord

- [ ] Decide whether `Bauhaus Digital` has its own Discord server.
- [ ] If it has its own server, create it manually in Discord and capture the guild ID.
- [ ] After the server exists and the bot has access, run `python3 director/scripts/provision_studio_discord.py studio-bauhaus <guild_id>`.
- [ ] Create a valid invite URL and write it into `studio.json` as `discord_invite`.
- [ ] Fill in `studio.json.discord.guild_id` and any `custom_channels` / `channel_map` the studio needs.
- [ ] Leave the Discord fields blank if this studio should stay hidden or does not have its own server yet.
- [ ] Only use `activate_studio.py --shared-discord` if you intentionally want this studio to reuse the main ystackai Discord.
- [ ] Verify the bot is in the guild and can see the intended channels.

## Director Wiring

- [ ] Clone the repo into every remote agent workspace. The director cannot schedule work against a studio that is missing from `/opt/workspaces/<agent>/...`.
- [ ] Add the studio slug to `YSTACK_STUDIOS` in the deployed director env.
- [ ] Keep `YSTACK_REPO=studio-bauhaus` only if this studio should remain the single default repo. Otherwise leave `YSTACK_REPO` as the default studio and rely on `YSTACK_STUDIOS` for multi-studio scheduling.
- [ ] Publish through `python3 director/scripts/publish_site.py ...` instead of manually rsyncing `/var/www/html` or hand-editing symlinks.
- [ ] Restart `gateway` and `director` after env changes.
- [ ] Verify `/health` is up and check scheduler logs to confirm the studio was discovered.

## Final Sanity Checks

## Launch Sequence

- [ ] Publish the first studio blog post so the page does not launch empty.
- [ ] Confirm `blog/` contains a Markdown source post plus rendered `.html` / `.json` output.
- [ ] Have the studio director post that launch blog post into the shared Discord `#general` and frame what the studio is about.
- [ ] Only after that announcement, let the crew start public conversation so the chat feed has context instead of appearing as random noise.

- [ ] Confirm the studio appears in the published snapshot/site the way you expect.
- [ ] Confirm public crew profile links use slot ids instead of internal operator handles.
- [ ] Confirm `.ystack/current/drop.json` exists and reflects the active Drop lane state.
- [ ] Confirm `.ystack/current/post.json` exists and reflects the active Blog lane state.
- [ ] Confirm `.ystack/current/compute.json` exists with the intended credit defaults.
- [ ] Confirm GitHub issues/project state, Discord links, and local workflow state all point at the same studio.

If any box above is unchecked, the studio may exist on disk but still not be truly active.
