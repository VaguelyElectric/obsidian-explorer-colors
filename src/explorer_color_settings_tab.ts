import {
    App,
    ButtonComponent,
    PluginSettingTab,
    Setting,
} from 'obsidian';
import ExplorerColors from '@app/main';
import ConfirmationModal from './confirmation_modal'

export default class ExplorerColorsSettingTab extends PluginSettingTab {
    private plugin: ExplorerColors;

    constructor(app: App, plugin: ExplorerColors) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        let { containerEl } = this;
        let config = this.plugin.getPluginConfig()

        containerEl.empty();
        containerEl.classList.add('explorer-colors-settings-tab')

        // "Default Color" Setting
        const defaultColorHeading = document.createDocumentFragment();
        const defaultColorTitle = defaultColorHeading.createEl('span', {
            text: 'Default Color',
        })
        const defaultColorResetButton = new ButtonComponent(defaultColorTitle);
        defaultColorResetButton.setClass('reset-action');
        defaultColorResetButton.setButtonText('RESET');
        defaultColorResetButton.onClick(() => {
            config.defaultColor = undefined;
            this.plugin.setPluginConfig(config)
            this.display()
        });
        new Setting(containerEl)
            .setName(defaultColorHeading)
            .setDesc('Default value for the Color Picker when assigning a new color to a File or Folder.')
            .addColorPicker((color) =>
                color
                .setValue(config.defaultColor || '')
                .onChange((value) => {
                    config.defaultColor = value;
                    this.plugin.setPluginConfig(config)
                })
            );

        // Divider
        containerEl.createEl('br')

        // Reset Option
        new Setting(containerEl)
            .setName('Clear Data')
            .setDesc('Removes all data from Files & Folders.')
            .setClass('reset-all')
            .addButton((button) =>
                button
                .setButtonText('Clear Data')
                .setWarning()
                .onClick(() => {
                    new ConfirmationModal(this.app,
                        'Clear Data',
                        'This action cannot be undone. Do you wish to proceed?',
                        () => { this.plugin.removeAllItemData() },
                    ).open();
                })
            );
    }
}
