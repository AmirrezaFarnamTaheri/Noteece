import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()

        // Handle the shared content
        handleSharedContent()
    }

    private func handleSharedContent() {
        guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem else {
            closeExtension()
            return
        }

        guard let itemProvider = extensionItem.attachments?.first else {
            closeExtension()
            return
        }

        // Check for URL (most common for social media posts)
        if itemProvider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
            itemProvider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] (item, error) in
                if let url = item as? URL {
                    self?.saveSharedURL(url)
                }
                DispatchQueue.main.async {
                    self?.closeExtension()
                }
            }
        }
        // Check for text
        else if itemProvider.hasItemConformingToTypeIdentifier(UTType.text.identifier) {
            itemProvider.loadItem(forTypeIdentifier: UTType.text.identifier, options: nil) { [weak self] (item, error) in
                if let text = item as? String {
                    self?.saveSharedText(text)
                }
                DispatchQueue.main.async {
                    self?.closeExtension()
                }
            }
        }
        // Check for image
        else if itemProvider.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
            itemProvider.loadItem(forTypeIdentifier: UTType.image.identifier, options: nil) { [weak self] (item, error) in
                if let imageURL = item as? URL {
                    self?.saveSharedImage(imageURL)
                }
                DispatchQueue.main.async {
                    self?.closeExtension()
                }
            }
        }
        else {
            closeExtension()
        }
    }

    private func saveSharedURL(_ url: URL) {
        let sharedData: [String: Any] = [
            "type": "url",
            "url": url.absoluteString,
            "timestamp": Date().timeIntervalSince1970
        ]
        saveToAppGroup(sharedData)
    }

    private func saveSharedText(_ text: String) {
        let sharedData: [String: Any] = [
            "type": "text",
            "text": text,
            "timestamp": Date().timeIntervalSince1970
        ]
        saveToAppGroup(sharedData)
    }

    private func saveSharedImage(_ imageURL: URL) {
        let sharedData: [String: Any] = [
            "type": "image",
            "url": imageURL.absoluteString,
            "timestamp": Date().timeIntervalSince1970
        ]
        saveToAppGroup(sharedData)
    }

    private func saveToAppGroup(_ data: [String: Any]) {
        let appGroupId = "group.com.noteece.app.social"

        guard let userDefaults = UserDefaults(suiteName: appGroupId) else {
            print("Failed to access app group")
            return
        }

        // Get existing shared items
        var sharedItems = userDefaults.array(forKey: "sharedItems") as? [[String: Any]] ?? []

        // Add new item
        sharedItems.append(data)

        // Save back to app group
        userDefaults.set(sharedItems, forKey: "sharedItems")
        userDefaults.synchronize()

        print("Saved shared content to app group")
    }

    private func closeExtension() {
        extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }
}
