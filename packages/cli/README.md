# lazy-apply

The runner for [Lazy Apply](https://lazyapply.online). It fills the job applications you approve in
Lazy Apply, in a Chrome window on your own computer, and waits for you to press Submit.

```
npx lazy-apply
```

That one command:

1. opens your browser so you can connect this computer to your Lazy Apply account (no token to copy);
2. checks Google Chrome is installed;
3. offers to start automatically in the background whenever you log in, keeping itself up to date.

Needs Node.js 18 or newer and Google Chrome. Works on macOS, Windows and Linux.

| Command | What it does |
| --- | --- |
| `npx lazy-apply` | Set up (once) and start |
| `npx lazy-apply status` | Account, automatic start, whether it is running |
| `npx lazy-apply autostart on` / `off` | Start, or stop starting, automatically at login |
| `npx lazy-apply start` | Run now, in this terminal |
| `npx lazy-apply logout` | Disconnect this computer |

Settings are in `~/.lazy-apply/config.json` and the log in `~/.lazy-apply/runner.log`. Forms are
filled in a separate Chrome profile (`~/.auto-apply/chrome-profile`), never your everyday one. Nothing is
ever submitted without your Submit in Lazy Apply.
