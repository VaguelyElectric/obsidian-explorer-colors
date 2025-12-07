import {
    Modal,
    App,
    ButtonComponent,
} from "obsidian";

export default class ConfirmationModal extends Modal {
    constructor(app: App, title: string, content: string, onConfirm: () => void, onCancel?: () => void) {
        super(app);

        this.setTitle(title);
        this.setContent(content)
		this.modalEl.classList.add('explorer-colors-confirmation-modal');

		const footerBlock = this.contentEl.createDiv({ cls: 'footer-container' });

		const confirmButton = new ButtonComponent(footerBlock);
        confirmButton.setButtonText('Confirm');
        confirmButton.setWarning();
        confirmButton.onClick(() => {
            this.close()
            onConfirm();
        });

		const cancelButton = new ButtonComponent(footerBlock);
        cancelButton.setButtonText('Cancel');
        cancelButton.onClick(() => {
            this.close()
            if (onCancel) {
                onCancel();
            }
        });
    }
}