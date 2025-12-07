import { View } from 'obsidian';

export interface ExplorerColorsSettings {
    itemData: Record<string, NavItemData>;
    pluginConfig: ExplorerColorsConfig;
}

export const DEFAULT_SETTINGS: ExplorerColorsSettings = {
    itemData: {},
    pluginConfig: {}
}

export interface NavItemData {
    itemColor?: string;
    cascadeEnabled?: boolean;
}

export interface ExplorerColorsConfig {
    defaultColor?: string;
}

export interface FileExplorerItem extends HTMLElement {
    el: HTMLElement;
}

export interface FileExplorerView extends View {
    fileItems: Record<string, FileExplorerItem>;
}

export enum ITEM_TYPE {
    FILE = 'file',
    FOLDER = 'folder',
}
