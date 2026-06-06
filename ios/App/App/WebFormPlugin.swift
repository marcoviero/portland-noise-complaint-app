import Foundation
import Capacitor
import UIKit

@objc(WebFormPlugin)
public class WebFormPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WebFormPlugin"
    public let jsName = "WebFormPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "openForm", returnType: CAPPluginReturnPromise)
    ]

    @objc func openForm(_ call: CAPPluginCall) {
        guard let data = call.getObject("data") else {
            call.reject("No data provided")
            return
        }
        DispatchQueue.main.async {
            let vc = WebFormViewController()
            vc.formData = data
            vc.modalPresentationStyle = .fullScreen
            self.bridge?.viewController?.present(vc, animated: true) {
                call.resolve()
            }
        }
    }
}
