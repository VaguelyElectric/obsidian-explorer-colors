import {
	Plugin,
	TFolder,
	View,
} from 'obsidian';
import ColorPickerModal from './color_picker_modal';
import {
	DEFAULT_SETTINGS,
	ExplorerColorsSettings,
	FileExplorerItem,
	FileExplorerView,
	ITEM_TYPE,
	NavItemSettings,
} from './types'

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

		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				this.removeItemSettings(file.path, false);
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

		const fileElements = this.findFileElements(path);
		for (const element of fileElements) {
			this.applyItemStyles(element.el, settings);
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
			const fileElements = this.findFileElements(path);
			for (const element of fileElements) {
				this.removeItemStyles(element.el);
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

	applyItemStyles(fileItem: HTMLElement, settings: NavItemSettings) {
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
		const data = Object.entries(this.data) as [
			string,
			NavItemSettings
		][];

		for (const [path, settings] of data) {
			const fileElements = this.findFileElements(path);
			for (const element of fileElements) {
				this.applyItemStyles(element.el, settings);
			}
		}
	}
}
