import {
	App,
	ButtonComponent,
	ColorComponent,
	Menu,
	Modal,
	Notice,
	Plugin,
	TAbstractFile,
	View,
} from 'obsidian';

interface ExplorerColorsSettings {}

const DEFAULT_SETTINGS: ExplorerColorsSettings = {}

interface NavItemSettings {
	itemColor?: string;
}

interface ExtensionFile extends TAbstractFile {
	extension?: string;
}

interface FileExplorerItem extends HTMLElement {
	el: HTMLElement;
}

interface FileExplorerView extends View {
	fileItems: Record<string, FileExplorerItem>;
}

export default class ExplorerColours extends Plugin {
	private data: Record<string, ExplorerColorsSettings | NavItemSettings>

	async onload() {
		await this.loadAllData();

		this.app.workspace.onLayoutReady(() => this.initData());

		this.registerEvent(
			this.app.workspace.on('file-menu', (menu: Menu, file: ExtensionFile) => {
				menu.addItem((item) => {
					const itemType = file.extension == undefined ? 'Folder' : 'File';
					const message = 'Set ' + itemType + ' Color';
					item.setTitle(message)
						.setIcon('palette')
						.onClick(async () => {
							new ColorPickerModal(this.app, this, file.path, itemType).open();
						});
				});
			})
		);
	}

	onunload() {}

	getData(): Record<string, ExplorerColorsSettings | NavItemSettings> {
		return this.data;
	}

	getSettings(): ExplorerColorsSettings {
		return this.data.settings as ExplorerColorsSettings;
	}

	addItemColor(path: string, colorHex: string) {
		this.getData()[path] = {
			itemColor: colorHex,
		};

		this.saveAllData();

		const fileElement = this.findFileElement(path);
		if (fileElement) {
			this.applyItemColor(fileElement.el, colorHex);
		}
	}

	getItemColor(path: string): string | undefined {
		const pathColorData = this.getData()[path];

		if (!pathColorData) {
			return undefined;
		}

		return (pathColorData as NavItemSettings).itemColor;
	}

	removeItemColor(path: string) {
		delete this.getData()[path];

		this.saveAllData();

		const fileElement = this.findFileElement(path);
		if (fileElement) {
			this.applyItemColor(fileElement.el, 'inherit');
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
			fileElement = (fileExplorer.view as FileExplorerView).fileItems[path];
		}

		return fileElement;
	}

	applyItemColor(fileItem: HTMLElement, colorHex: string) {
		fileItem.setCssProps({'--current-color': colorHex});
	}

	initData() {
		const fileExplorers = this.app.workspace.getLeavesOfType('file-explorer');
		const data = Object.entries(this.data) as [
			string,
			NavItemSettings
		][];

		for (const fileExplorer of fileExplorers) {
			for (const [path, value] of data) {
				const fileItem = (fileExplorer.view as FileExplorerView).fileItems[path];
				if (fileItem && value.itemColor) {
					this.applyItemColor(fileItem.el, value.itemColor || 'inherit');
				}
			}
		}
	}
}

class ColorPickerModal extends Modal {
	private plugin: ExplorerColours;
	private path: string;
	private itemType: string;

	private userColor?: string;

	constructor(app: App, plugin: ExplorerColours, path: string, itemType: string) {
		super(app);
		this.plugin = plugin;
		this.path = path;
		this.itemType = itemType;

		this.userColor = this.plugin.getItemColor(this.path);

		this.modalEl.classList.add('explorer-colors-color-picker-modal');
		this.titleEl.setText('Change color');

		// Picker Block
		const pickerBlock = this.contentEl.createDiv({ cls: 'picker-container' });

		pickerBlock.createEl('p', {
			text: 'Select a color for this ' + this.itemType,
			cls: 'picker-description'
		});

		const colorPicker = new ColorComponent(pickerBlock);
		colorPicker.setValue(this.userColor || '#000000')
			.onChange((value) => {
				this.userColor = value;
			});

		// Footer Block
		const footerBlock = this.contentEl.createDiv({ cls: 'footer-container' });

		const resetButton = new ButtonComponent(footerBlock);
		resetButton.setButtonText('Reset');
		resetButton.onClick(() => {
			colorPicker.setValue('#000000');
			this.userColor = undefined;
		});

		const saveButton = new ButtonComponent(footerBlock);
		saveButton.setButtonText('Save');
		saveButton.onClick(() => {
			new Notice(this.itemType + ' color changed');
			if (this.userColor) {
				this.plugin.addItemColor(this.path, this.userColor);
			} else {
				this.plugin.removeItemColor(this.path);
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
