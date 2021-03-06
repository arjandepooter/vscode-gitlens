'use strict';
import { Objects } from './system';
import { Disposable, ExtensionContext, languages, TextEditor, workspace } from 'vscode';
import { IConfig } from './configuration';
import { CommandContext, ExtensionKey, setCommandContext } from './constants';
import { GitCodeLensProvider } from './gitCodeLensProvider';
import { GitService } from './gitService';
import { Logger } from './logger';

export class CodeLensController extends Disposable {

    private _codeLensProvider: GitCodeLensProvider | undefined;
    private _codeLensProviderDisposable: Disposable | undefined;
    private _config: IConfig;
    private _disposable: Disposable | undefined;

    constructor(private context: ExtensionContext, private git: GitService) {
        super(() => this.dispose());

        this._onConfigurationChanged();

        const subscriptions: Disposable[] = [];

        subscriptions.push(workspace.onDidChangeConfiguration(this._onConfigurationChanged, this));
        subscriptions.push(git.onDidChangeGitCache(this._onGitCacheChanged, this));

        this._disposable = Disposable.from(...subscriptions);
    }

    dispose() {
        this._disposable && this._disposable.dispose();

        this._codeLensProviderDisposable && this._codeLensProviderDisposable.dispose();
        this._codeLensProviderDisposable = undefined;
        this._codeLensProvider = undefined;
    }

    private _onConfigurationChanged() {
        const cfg = workspace.getConfiguration().get<IConfig>(ExtensionKey)!;

        if (!Objects.areEquivalent(cfg.codeLens, this._config && this._config.codeLens)) {
            Logger.log('CodeLens config changed; resetting CodeLens provider');
            if (cfg.codeLens.enabled && (cfg.codeLens.recentChange.enabled || cfg.codeLens.authors.enabled)) {
                if (this._codeLensProvider) {
                    this._codeLensProvider.reset();
                }
                else {
                    this._codeLensProvider = new GitCodeLensProvider(this.context, this.git);
                    this._codeLensProviderDisposable = languages.registerCodeLensProvider(GitCodeLensProvider.selector, this._codeLensProvider);
                }
            }
            else {
                this._codeLensProviderDisposable && this._codeLensProviderDisposable.dispose();
                this._codeLensProviderDisposable = undefined;
                this._codeLensProvider = undefined;
            }

            setCommandContext(CommandContext.CanToggleCodeLens, cfg.codeLens.recentChange.enabled || cfg.codeLens.authors.enabled);
        }

        this._config = cfg;
    }

    private _onGitCacheChanged() {
        Logger.log('Git cache changed; resetting CodeLens provider');
        this._codeLensProvider && this._codeLensProvider.reset();
    }

    toggleCodeLens(editor: TextEditor) {
        if (!this._config.codeLens.recentChange.enabled && !this._config.codeLens.authors.enabled) return;

        Logger.log(`toggleCodeLens()`);
        if (this._codeLensProviderDisposable) {
            this._codeLensProviderDisposable.dispose();
            this._codeLensProviderDisposable = undefined;
            return;
        }

        this._codeLensProviderDisposable = languages.registerCodeLensProvider(GitCodeLensProvider.selector, new GitCodeLensProvider(this.context, this.git));
    }
}
