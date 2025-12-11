import {
	Plugin,
	TFolder,
	View,
} from 'obsidian';
import ColorPickerModal from './color_picker_modal';
import ExplorerColorsSettingTab from './explorer_color_settings_tab';
import {
	DEFAULT_SETTINGS,
	ExplorerColorsConfig,
	ExplorerColorsSettings,
	FileExplorerItem,
	FileExplorerView,
	ITEM_TYPE,
	NavItemData,
} from './types'

export default class ExplorerColors extends Plugin {
	private data: ExplorerColorsSettings;

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
						.onClick(() => {
							new ColorPickerModal(this.app, this, file.path, itemType).open();
						});
				});
			})
		);

		this.registerEvent(
			this.app.vault.on('rename', (file, oldPath) => {
				const existingSettings = this.getItemData(oldPath);
				if (existingSettings) {
					this.addItemSettings(file.path, existingSettings);
					this.removeItemSettings(oldPath, false);
				}
			}),
		);

		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				this.removeItemSettings(file.path, false);
			}),
		);

	    this.addSettingTab(new ExplorerColorsSettingTab(this.app, this));
	}

	onunload() {}

	getItemData(path: string): NavItemData | undefined {
		return this.data.itemData[path];
	}

	setItemData(path: string, data: NavItemData) {
		this.data.itemData[path] = data;
	}

	removeItemData(path: string) {
		delete this.data.itemData[path];
	}

	removeAllItemData() {
		Object.entries(this.data.itemData).forEach(([path, _]) => {
			const fileElements = this.findFileElements(path);
			for (const element of fileElements) {
				this.removeItemStyles(element.el);
			}
		});
		this.data.itemData = {};
		this.saveAllData();
	}

	getPluginConfig(): ExplorerColorsConfig {
		return this.data.pluginConfig;
	}

	setPluginConfig(config: ExplorerColorsConfig) {
		this.data.pluginConfig = config;
		this.saveAllData();
	}

	addItemSettings(path: string, settings: NavItemData) {
		this.setItemData(path, settings);
		this.saveAllData();

		const fileElements = this.findFileElements(path);
		for (const element of fileElements) {
			this.applyItemStyles(element.el, settings);
		}
	}

	removeItemSettings(path: string, redraw = true) {
		this.removeItemData(path);
		this.saveAllData();

		if (redraw) {
			const fileElements = this.findFileElements(path);
			for (const element of fileElements) {
				this.removeItemStyles(element.el);
			}
		}
	}

	async loadAllData() {
		const loadedData = await this.loadData();

		var data: ExplorerColorsSettings = DEFAULT_SETTINGS;
		if (loadedData) {
			if (loadedData['itemData'] != undefined) {
				data.itemData = loadedData['itemData']
			}
			if (loadedData['pluginConfig'] != undefined) {
				data.pluginConfig = loadedData['pluginConfig']
			}
			// Migrate from old structure
			Object.entries(loadedData).forEach(([key, _]) => {
				let keys = Object.keys(DEFAULT_SETTINGS)
				if (keys.includes(key)) {
					delete loadedData[key]
				}
			});
		}

		data.itemData = Object.assign({ ...data.itemData}, {}, loadedData);
		this.data = data;
	}

	async saveAllData() {
		await this.saveData(this.data);
	}

	findFileElements(path: string): FileExplorerItem[] {
		const fileExplorers = this.app.workspace.getLeavesOfType('file-explorer');
		let result: FileExplorerItem[] = [];

		for (const fileExplorer of fileExplorers) {
			if (fileExplorer.isDeferred) {
				continue;
			}

			const fileElement = (fileExplorer.view as FileExplorerView).fileItems[path];
			if (fileElement) {
				result.push(fileElement);
			}
		}

		return result;
	}

	applyItemStyles(fileItem: HTMLElement, settings: NavItemData) {
		this.removeItemStyles(fileItem);

		fileItem.classList.add('explorer-color-enabled');
		const titleElement = fileItem.getElementsByClassName('tree-item-self')[0] as HTMLElement;

		if (settings.cascadeEnabled) {
			fileItem.style.setProperty('--explorer-colors-current-color', settings?.itemColor || 'inherit')
			fileItem.classList.add('explorer-cascade-enabled');
		} else {
			titleElement.style.setProperty('--explorer-colors-current-color', settings?.itemColor || 'inherit')
		}
	}

	removeItemStyles(fileItem: HTMLElement) {
		fileItem.classList.remove('explorer-color-enabled');
		fileItem.classList.remove('explorer-cascade-enabled');
		fileItem.style.removeProperty('--explorer-colors-current-color');
	}

	initData() {
		const data = Object.entries(this.data.itemData) as [
			string,
			NavItemData
		][];

		for (const [path, settings] of data) {
			const fileElements = this.findFileElements(path);
			for (const element of fileElements) {
				this.applyItemStyles(element.el, settings);
			}
		}
	}
}
