import { View } from 'obsidian';

export interface ExplorerColorsSettings {}

export const DEFAULT_SETTINGS: ExplorerColorsSettings = {}

export interface NavItemSettings {
    itemColor?: string;
    cascadeEnabled?: boolean;
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
