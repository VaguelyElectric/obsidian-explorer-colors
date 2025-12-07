import {
    Modal,
    App,
    ColorComponent,
    ToggleComponent,
    ButtonComponent,
    Notice,
} from 'obsidian';
import ExplorerColors from '@app/main';
import {
    ITEM_TYPE,
    NavItemData
} from './types'

export default class ColorPickerModal extends Modal {
	private plugin: ExplorerColors;
	private readonly path: string;
	private readonly itemType: ITEM_TYPE;

	private userSettings?: NavItemData;

	constructor(app: App, plugin: ExplorerColors, path: string, itemType: ITEM_TYPE) {
		super(app);
		this.plugin = plugin;
		this.path = path;
		this.itemType = itemType;

		this.userSettings = this.plugin.getItemData(this.path) || {};

		this.modalEl.classList.add('explorer-colors-item-settings-modal');
		this.titleEl.setText('Change color');

		// Settings Block
		const settingsBlock = this.contentEl.createDiv({ cls: 'settings-container' });

		const pickerSetting = settingsBlock.createDiv();
		pickerSetting.createEl('p', {
			text: 'Select a color for this ' + this.itemType,
			cls: 'picker-description'
		});
		const colorPicker = new ColorComponent(pickerSetting);
        const initColorValue = this.userSettings?.itemColor || this.plugin.getPluginConfig().defaultColor;
		colorPicker.setValue(initColorValue || '')
			.onChange((value) => {
				if (!this.userSettings) {
					this.userSettings = {};
				}
				this.userSettings.itemColor = value;
			});

		const cascadeSetting = settingsBlock.createDiv();
		cascadeSetting.createEl('p', {
			text: 'Enable Cascade?',
			cls: 'picker-description'
		});
		const toggle = new ToggleComponent(cascadeSetting);
		toggle.setValue(this.userSettings?.cascadeEnabled || false)
			.setDisabled(itemType == ITEM_TYPE.FILE)
			.onChange((value) => {
				if (!this.userSettings) {
					this.userSettings = {};
				}
				this.userSettings.cascadeEnabled = value;
			});

		// Footer Block
		const footerBlock = this.contentEl.createDiv({ cls: 'footer-container' });

		const resetButton = new ButtonComponent(footerBlock);
		resetButton.setButtonText('Reset');
		resetButton.onClick(() => {
			colorPicker.setValue('#000000');
			this.userSettings = undefined;
		});

		const saveButton = new ButtonComponent(footerBlock);
		saveButton.setButtonText('Save');
		saveButton.onClick(() => {
			new Notice(this.itemType + ' color changed');
			if (this.userSettings) {
				this.plugin.addItemSettings(this.path, this.userSettings);
			} else {
				this.plugin.removeItemSettings(this.path);
			}
			this.close();
		});
	}

	onOpen() {
		super.onOpen();
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}