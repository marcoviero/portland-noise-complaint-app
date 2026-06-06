import Capacitor

@objc(ViewController)
class ViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(WebFormPlugin())
    }
}
