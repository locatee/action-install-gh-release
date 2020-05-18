import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import * as github from "@actions/github";
import * as os from "os";

const mkdirp = require("mkdirp-promise");

async function run() {
    try {

        // set up auth/environment
        const token = process.env['GITHUB_TOKEN']
        if (!token) {
            throw new Error(
                `No GitHub token found`
            )
        }
        const octokit: github.GitHub = new github.GitHub(token)

        const repo = core.getInput("repo");
        if (!repo) {
            throw new Error(
                `Repo was not specified`
            )
            return;
        }

        const binary = core.getInput("binary_name");
        if (!binary) {
            throw new Error(
                `Binary name not specified`
            )
            return;
        }

        const tag = core.getInput("tag");
        if (!tag) {
            throw new Error(
                `Tag not specified`
            )
        }

        const destination = `/home/runner/.${binary}`;
        await mkdirp(destination);

        let osPlatform = os.platform();
        if (osPlatform != "linux" && osPlatform != "darwin") {
            core.setFailed(`Unsupported operating system - ${binary} is only released for Darwin and Linux`);
            return;
        }

        const [owner, project] = repo.split("/")
        const getReleaseUrl = await octokit.repos.getReleaseByTag({
            owner: owner,
            repo: project,
            tag: tag,
        })

        let url = getReleaseUrl.data.assets.filter(obj => {
            return obj.browser_download_url.search(osPlatform)
            }
        )

        // const url = `https://github.com/${repo}/releases/download/${tag}/${binary}-${tag}-${osPlatform}-x64.tar.gz`
        console.log(`Downloading ${binary} from ${url}`)
        const binPath = await tc.downloadTool(url);
        const extractedPath = await tc.extractTar(binPath, destination);

        core.addPath(extractedPath);
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
