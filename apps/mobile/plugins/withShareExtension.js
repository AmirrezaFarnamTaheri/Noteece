/**
 * Expo Config Plugin for Share Extension
 *
 * This plugin configures both iOS Share Extension and Android Share Target
 * to allow sharing content from other apps into Noteece Social Hub.
 *
 * iOS: Creates a Share Extension target with Swift code
 * Android: Configures intent filters for sharing
 */

const {
  withEntitlementsPlist,
  withAndroidManifest,
  withDangerousMod,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Main plugin function
 */
function withShareExtension(config) {
  // iOS configuration
  config = withShareExtensionIOS(config);

  // Android configuration
  config = withShareExtensionAndroid(config);

  return config;
}

/**
 * iOS Share Extension Configuration
 */
function withShareExtensionIOS(config) {
  // Add app groups entitlement (required for sharing data between app and extension)
  config = withEntitlementsPlist(config, (config) => {
    config.modResults["com.apple.security.application-groups"] = [
      `group.${config.ios.bundleIdentifier}.social`,
    ];
    return config;
  });

  // Create the share extension files
  config = withDangerousMod(config, [
    "ios",
    async (config) => {
      const iosRoot = config.modRequest.platformProjectRoot;
      const shareExtensionPath = path.join(iosRoot, "ShareExtension");

      // Create ShareExtension directory
      if (!fs.existsSync(shareExtensionPath)) {
        fs.mkdirSync(shareExtensionPath, { recursive: true });
      }

      // Copy share extension files
      copyShareExtensionFiles(shareExtensionPath, config);

      return config;
    },
  ]);

  return config;
}

/**
 * Copy iOS Share Extension files
 */
function copyShareExtensionFiles(targetPath, config) {
  const bundleIdentifier = config.ios.bundleIdentifier;
  const extensionBundleId = `${bundleIdentifier}.ShareExtension`;

  // ShareViewController.swift
  const shareViewControllerContent = `import UIKit
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
        let appGroupId = "group.${bundleIdentifier}.social"

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
`;

  // Info.plist for Share Extension
  const infoPlistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    <key>CFBundleDisplayName</key>
    <string>Share to Noteece</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>${extensionBundleId}</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>NSExtension</key>
    <dict>
        <key>NSExtensionAttributes</key>
        <dict>
            <key>NSExtensionActivationRule</key>
            <dict>
                <key>NSExtensionActivationSupportsWebURLWithMaxCount</key>
                <integer>1</integer>
                <key>NSExtensionActivationSupportsText</key>
                <true/>
                <key>NSExtensionActivationSupportsImageWithMaxCount</key>
                <integer>5</integer>
            </dict>
        </dict>
        <key>NSExtensionMainStoryboard</key>
        <string>MainInterface</string>
        <key>NSExtensionPointIdentifier</key>
        <string>com.apple.share-services</string>
    </dict>
</dict>
</plist>
`;

  // MainInterface.storyboard (basic UI)
  const storyboardContent = `<?xml version="1.0" encoding="UTF-8"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0" toolsVersion="21507" targetRuntime="iOS.CocoaTouch" propertyAccessControl="none" useAutolayout="YES" useTraitCollections="YES" useSafeAreas="YES" colorMatched="YES" initialViewController="j1y-V4-xli">
    <device id="retina6_1" orientation="portrait" appearance="light"/>
    <dependencies>
        <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="21505"/>
        <capability name="Safe area layout guides" minToolsVersion="9.0"/>
        <capability name="documents saved in the Xcode 8 format" minToolsVersion="8.0"/>
    </dependencies>
    <scenes>
        <scene sceneID="ceB-am-kn3">
            <objects>
                <viewController id="j1y-V4-xli" customClass="ShareViewController" customModule="ShareExtension" customModuleProvider="target" sceneMemberID="viewController">
                    <view key="view" opaque="NO" contentMode="scaleToFill" id="wbc-yd-nQP">
                        <rect key="frame" x="0.0" y="0.0" width="414" height="896"/>
                        <autoresizingMask key="autoresizingMask" widthSizable="YES" heightSizable="YES"/>
                        <subviews>
                            <label opaque="NO" userInteractionEnabled="NO" contentMode="left" horizontalHuggingPriority="251" verticalHuggingPriority="251" text="Saving to Noteece..." textAlignment="center" lineBreakMode="tailTruncation" baselineAdjustment="alignBaselines" adjustsFontSizeToFit="NO" translatesAutoresizingMaskIntoConstraints="NO" id="VXT-ex-7Rm">
                                <rect key="frame" x="20" y="437.5" width="374" height="21"/>
                                <fontDescription key="fontDescription" type="system" pointSize="17"/>
                                <color key="textColor" white="1" alpha="1" colorSpace="custom" customColorSpace="genericGamma22GrayColorSpace"/>
                                <nil key="highlightedColor"/>
                            </label>
                        </subviews>
                        <viewLayoutGuide key="safeArea" id="1Xd-am-t49"/>
                        <color key="backgroundColor" red="0.062745098039215685" green="0.12941176470588237" blue="0.21568627450980393" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>
                        <constraints>
                            <constraint firstItem="VXT-ex-7Rm" firstAttribute="centerX" secondItem="wbc-yd-nQP" secondAttribute="centerX" id="9bD-aS-aPp"/>
                            <constraint firstItem="VXT-ex-7Rm" firstAttribute="centerY" secondItem="wbc-yd-nQP" secondAttribute="centerY" id="Q1h-gS-cKq"/>
                            <constraint firstItem="VXT-ex-7Rm" firstAttribute="leading" secondItem="1Xd-am-t49" secondAttribute="leading" constant="20" id="hSD-0g-qbO"/>
                            <constraint firstItem="1Xd-am-t49" firstAttribute="trailing" secondItem="VXT-ex-7Rm" secondAttribute="trailing" constant="20" id="vmu-XJ-fhd"/>
                        </constraints>
                    </view>
                </viewController>
                <placeholder placeholderIdentifier="IBFirstResponder" id="CEy-Cv-SGf" userLabel="First Responder" sceneMemberID="firstResponder"/>
            </objects>
            <point key="canvasLocation" x="139" y="139"/>
        </scene>
    </scenes>
</document>
`;

  // Write files
  fs.writeFileSync(
    path.join(targetPath, "ShareViewController.swift"),
    shareViewControllerContent,
  );
  fs.writeFileSync(path.join(targetPath, "Info.plist"), infoPlistContent);
  fs.writeFileSync(
    path.join(targetPath, "MainInterface.storyboard"),
    storyboardContent,
  );

  console.log("✅ iOS Share Extension files created");
}

/**
 * Android Share Target Configuration
 */
function withShareExtensionAndroid(config) {
  config = withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];

    // Add share target activity
    const shareActivity = {
      $: {
        "android:name": ".ShareActivity",
        "android:label": "Share to Noteece",
        "android:theme": "@style/Theme.Transparent",
        "android:exported": "true",
      },
      "intent-filter": [
        {
          action: [{ $: { "android:name": "android.intent.action.SEND" } }],
          category: [
            { $: { "android:name": "android.intent.category.DEFAULT" } },
          ],
          data: [
            { $: { "android:mimeType": "text/plain" } },
            { $: { "android:mimeType": "image/*" } },
          ],
        },
        {
          action: [
            { $: { "android:name": "android.intent.action.SEND_MULTIPLE" } },
          ],
          category: [
            { $: { "android:name": "android.intent.category.DEFAULT" } },
          ],
          data: [{ $: { "android:mimeType": "image/*" } }],
        },
      ],
    };

    // Check if activity already exists
    if (!mainApplication.activity) {
      mainApplication.activity = [];
    }

    // Remove existing share activity if present
    mainApplication.activity = mainApplication.activity.filter(
      (activity) => activity.$["android:name"] !== ".ShareActivity",
    );

    // Add share activity
    mainApplication.activity.push(shareActivity);

    return config;
  });

  // Create ShareActivity.kt file
  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const androidRoot = config.modRequest.platformProjectRoot;
      const packagePath = config.android.package.replace(/\./g, "/");
      const activityPath = path.join(
        androidRoot,
        "app/src/main/java",
        packagePath,
      );

      // Create directory if it doesn't exist
      if (!fs.existsSync(activityPath)) {
        fs.mkdirSync(activityPath, { recursive: true });
      }

      // Create ShareActivity.kt
      const shareActivityContent = `package ${config.android.package}

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.content.Context
import org.json.JSONObject
import org.json.JSONArray
import java.io.File
import java.io.FileOutputStream

class ShareActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        handleSharedContent()
        finish()
    }

    private fun handleSharedContent() {
        when (intent?.action) {
            Intent.ACTION_SEND -> {
                handleSingleShare()
            }
            Intent.ACTION_SEND_MULTIPLE -> {
                handleMultipleShare()
            }
        }
    }

    private fun handleSingleShare() {
        val type = intent.type ?: return

        when {
            type.startsWith("text/") -> {
                val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
                if (sharedText != null) {
                    saveSharedText(sharedText)
                }
            }
            type.startsWith("image/") -> {
                val imageUri = intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
                if (imageUri != null) {
                    saveSharedImage(imageUri)
                }
            }
        }
    }

    private fun handleMultipleShare() {
        val imageUris = intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM)
        if (imageUris != null) {
            for (uri in imageUris) {
                saveSharedImage(uri)
            }
        }
    }

    private fun saveSharedText(text: String) {
        val sharedData = JSONObject().apply {
            put("type", "text")
            put("text", text)
            put("timestamp", System.currentTimeMillis())
        }
        saveToSharedPreferences(sharedData)
    }

    private fun saveSharedImage(uri: Uri) {
        val sharedData = JSONObject().apply {
            put("type", "image")
            put("uri", uri.toString())
            put("timestamp", System.currentTimeMillis())
        }
        saveToSharedPreferences(sharedData)
    }

    private fun saveToSharedPreferences(data: JSONObject) {
        try {
            val prefs = getSharedPreferences("noteece_shared_items", Context.MODE_PRIVATE)
            val existingItems = prefs.getString("items", "[]")
            val itemsArray = JSONArray(existingItems)

            // Add new item
            itemsArray.put(data)

            // Save back
            prefs.edit().putString("items", itemsArray.toString()).apply()

            // Launch main app to process the shared content
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            launchIntent?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                putExtra("shared_content", true)
                startActivity(this)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
`;

      const activityFile = path.join(activityPath, "ShareActivity.kt");
      fs.writeFileSync(activityFile, shareActivityContent);

      console.log("✅ Android ShareActivity created");

      return config;
    },
  ]);

  return config;
}

module.exports = withShareExtension;
