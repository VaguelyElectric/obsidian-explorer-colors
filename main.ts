import {
	App,
	ButtonComponent,
	ColorComponent,
	Modal,
	Notice,
	Plugin,
	TFolder,
	ToggleComponent,
	View,
} from 'obsidian';

interface ExplorerColorsSettings {}

const DEFAULT_SETTINGS: ExplorerColorsSettings = {}

interface NavItemSettings {
	itemColor?: string;
	cascadeEnabled?: boolean;
}

interface FileExplorerItem extends HTMLElement {
	el: HTMLElement;
}

interface FileExplorerView extends View {
	fileItems: Record<string, FileExplorerItem>;
}

enum ITEM_TYPE {
	FILE = 'file',
	FOLDER = 'folder',
}

export default class ExplorerColours extends Plugin {
	private data: Record<string, ExplorerColorsSettings | NavItemSettings>

	async onload() {
		await this.loadAllData();

		this.app.workspace.onLayoutReady(() => this.initData());

		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				menu.addItem((item) => {
					const itemType = file instanceof TFolder ? ITEM_TYPE.FOLDER : ITEM_TYPE.FILE;
					const message = 'Set ' + itemType + ' color';
					item.setTitle(message)
						.setIcon('palette')
						.onClick(async () => {
							new ColorPickerModal(this.app, this, file.path, itemType).open();
						});
				});
			})
		);

		this.registerEvent(
			this.app.vault.on('rename', (file, oldPath) => {
				const existingSettings = this.getItemSettings(oldPath);
				if (existingSettings) {
					this.addItemSettings(file.path, existingSettings);
					this.removeItemSettings(oldPath, false);
				}
			}),
		);
	}

	onunload() {}

	getData(): Record<string, ExplorerColorsSettings | NavItemSettings | undefined> {
		return this.data;
	}

	getSettings(): ExplorerColorsSettings {
		return this.data.settings as ExplorerColorsSettings;
	}

	addItemSettings(path: string, settings: NavItemSettings) {
		this.getData()[path] = settings;
		this.saveAllData();

		const fileElement = this.findFileElement(path);
		if (fileElement) {
			this.applyItemSettings(fileElement.el, settings);
		}
	}

	getItemSettings(path: string): NavItemSettings | undefined {
		const pathData = this.getData()[path];

		if (!pathData) {
			return undefined;
		}

		return pathData as NavItemSettings;
	}

	removeItemSettings(path: string, redraw = true) {
		delete this.getData()[path];
		this.saveAllData();

		if (redraw) {
			const fileElement = this.findFileElement(path);
			if (fileElement) {
				fileElement.el.classList.remove('explorer-color-enabled');
				fileElement.el.classList.remove('explorer-cascade-enabled');
				fileElement.el.style.removeProperty('--explorer-colors-current-color');
			}
		}
	}

	async loadAllData() {
		const data = await this.loadData();
		if (data) {
			Object.entries(DEFAULT_SETTINGS).forEach(([key, value]) => {
				if (data.settings[key] == undefined) {
					data.settings[key] = value;
				}
			});
		}
		this.data = Object.assign({ settings: { ...DEFAULT_SETTINGS } }, {}, data)
	}

	async saveAllData() {
		await this.saveData(this.data);
	}

	findFileElement(path: string): FileExplorerItem | undefined {
		const fileExplorers = this.app.workspace.getLeavesOfType('file-explorer');
		let fileElement: FileExplorerItem | undefined;
		for (const fileExplorer of fileExplorers) {
			if (fileExplorer.isDeferred) {
				continue;
			}

			fileElement = (fileExplorer.view as FileExplorerView).fileItems[path];
		}

		return fileElement;
	}

	applyItemSettings(fileItem: HTMLElement, settings: NavItemSettings) {
		fileItem.classList.add('explorer-color-enabled');
		fileItem.style.setProperty('--explorer-colors-current-color', settings?.itemColor || 'inherit')

		if (settings.cascadeEnabled) {
			fileItem.classList.add('explorer-cascade-enabled');
		} else {
			fileItem.classList.remove('explorer-cascade-enabled');
		}
	}

	initData() {
		const fileExplorers = this.app.workspace.getLeavesOfType('file-explorer');
		const data = Object.entries(this.data) as [
			string,
			NavItemSettings
		][];

		for (const fileExplorer of fileExplorers) {
			if (fileExplorer.isDeferred) {
				continue;
			}

			for (const [path, value] of data) {
				const fileItem = (fileExplorer.view as FileExplorerView).fileItems[path];
				if (fileItem && value.itemColor) {
					this.applyItemSettings(fileItem.el, value);
				}
			}
		}
	}
}

class ColorPickerModal extends Modal {
	private plugin: ExplorerColours;
	private readonly path: string;
	private readonly itemType: ITEM_TYPE;

	private userSettings?: NavItemSettings;

	constructor(app: App, plugin: ExplorerColours, path: string, itemType: ITEM_TYPE) {
		super(app);
		this.plugin = plugin;
		this.path = path;
		this.itemType = itemType;

		this.userSettings = this.plugin.getItemSettings(this.path) || {};

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
		colorPicker.setValue(this.userSettings.itemColor || '#000000')
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
		toggle.setValue(this.userSettings.cascadeEnabled || false)
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
