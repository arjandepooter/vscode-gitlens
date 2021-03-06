'use strict';
import { commands, Range, Uri } from 'vscode';
import { BuiltInCommands } from '../../constants';
import { GitLogCommit } from '../../gitService';

export type RemoteResourceType = 'branch' | 'branches' | 'commit' | 'file' | 'repo' | 'revision';
export type RemoteResource =
    { type: 'branch', branch: string } |
    { type: 'branches' } |
    { type: 'commit', sha: string } |
    { type: 'file', branch?: string, fileName: string, range?: Range } |
    { type: 'repo' } |
    { type: 'revision', branch?: string, commit?: GitLogCommit, fileName: string, range?: Range, sha?: string };

export function getNameFromRemoteResource(resource: RemoteResource) {
    switch (resource.type) {
        case 'branch': return 'Branch';
        case 'branches': return 'Branches';
        case 'commit': return 'Commit';
        case 'file': return 'File';
        case 'repo': return 'Repository';
        case 'revision': return 'Revision';
        default: return '';
    }
}

export abstract class RemoteProvider {

    private _name: string | undefined;

    constructor(
        public readonly domain: string,
        public readonly path: string,
        name?: string,
        public readonly custom: boolean = false
    ) {
        this._name = name;
    }

    abstract get name(): string;

    protected get baseUrl() {
        return `https://${this.domain}/${this.path}`;
    }

    protected formatName(name: string) {
        if (this._name !== undefined) return this._name;
        return `${name}${this.custom ? ` (${this.domain})` : ''}`;
    }

    protected splitPath(): [string, string] {
        const index = this.path.indexOf('/');
        return [ this.path.substring(0, index), this.path.substring(index + 1) ];
    }

    protected getUrlForRepository(): string {
        return this.baseUrl;
    }
    protected abstract getUrlForBranches(): string;
    protected abstract getUrlForBranch(branch: string): string;
    protected abstract getUrlForCommit(sha: string): string;
    protected abstract getUrlForFile(fileName: string, branch?: string, sha?: string, range?: Range): string;

    private async _openUrl(url: string): Promise<{} | undefined> {
        if (url === undefined) return undefined;

        return commands.executeCommand(BuiltInCommands.Open, Uri.parse(url));
    }

    open(resource: RemoteResource): Promise<{} | undefined> {
        switch (resource.type) {
            case 'branch': return this.openBranch(resource.branch);
            case 'branches': return this.openBranches();
            case 'commit': return this.openCommit(resource.sha);
            case 'file': return this.openFile(resource.fileName, resource.branch, undefined, resource.range);
            case 'repo': return this.openRepo();
            case 'revision': return this.openFile(resource.fileName, resource.branch, resource.sha, resource.range);
        }
    }

    openRepo() {
        return this._openUrl(this.getUrlForRepository());
    }

    openBranches() {
        return this._openUrl(this.getUrlForBranches());
    }

    openBranch(branch: string) {
        return this._openUrl(this.getUrlForBranch(branch));
    }

    openCommit(sha: string) {
        return this._openUrl(this.getUrlForCommit(sha));
    }

    openFile(fileName: string, branch?: string, sha?: string, range?: Range) {
        return this._openUrl(this.getUrlForFile(fileName, branch, sha, range));
    }
}