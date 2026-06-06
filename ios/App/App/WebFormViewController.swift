import UIKit
import WebKit
import Capacitor

class WebFormViewController: UIViewController, WKNavigationDelegate {

    var formData: JSObject = [:]

    private var webView: WKWebView!
    private var progressBar: UIProgressView!
    private var progressObserver: NSKeyValueObservation?

    // MARK: – Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.11, green: 0.11, blue: 0.12, alpha: 1)
        buildUI()
        loadPortlandForm()
    }

    deinit {
        progressObserver?.invalidate()
    }

    // MARK: – UI

    private func buildUI() {
        // ── Nav bar ──────────────────────────────────────────────
        let navBar = UIView()
        navBar.backgroundColor = UIColor(red: 0.11, green: 0.11, blue: 0.12, alpha: 1)
        navBar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(navBar)

        let separator = UIView()
        separator.backgroundColor = UIColor.separator
        separator.translatesAutoresizingMaskIntoConstraints = false
        navBar.addSubview(separator)

        let titleLabel = UILabel()
        titleLabel.text = "File Noise Complaint"
        titleLabel.textColor = .white
        titleLabel.font = .systemFont(ofSize: 17, weight: .semibold)
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        navBar.addSubview(titleLabel)

        let closeBtn = UIButton(type: .system)
        closeBtn.setTitle("Close", for: .normal)
        closeBtn.setTitleColor(.systemBlue, for: .normal)
        closeBtn.titleLabel?.font = .systemFont(ofSize: 17)
        closeBtn.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
        closeBtn.translatesAutoresizingMaskIntoConstraints = false
        navBar.addSubview(closeBtn)

        // ── Progress bar ─────────────────────────────────────────
        progressBar = UIProgressView(progressViewStyle: .bar)
        progressBar.trackTintColor = .clear
        progressBar.progressTintColor = .systemBlue
        progressBar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(progressBar)

        // ── WKWebView ────────────────────────────────────────────
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)

        // ── Constraints ──────────────────────────────────────────
        NSLayoutConstraint.activate([
            navBar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            navBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            navBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            navBar.heightAnchor.constraint(equalToConstant: 44),

            separator.bottomAnchor.constraint(equalTo: navBar.bottomAnchor),
            separator.leadingAnchor.constraint(equalTo: navBar.leadingAnchor),
            separator.trailingAnchor.constraint(equalTo: navBar.trailingAnchor),
            separator.heightAnchor.constraint(equalToConstant: 0.5),

            titleLabel.centerXAnchor.constraint(equalTo: navBar.centerXAnchor),
            titleLabel.centerYAnchor.constraint(equalTo: navBar.centerYAnchor),

            closeBtn.leadingAnchor.constraint(equalTo: navBar.leadingAnchor, constant: 16),
            closeBtn.centerYAnchor.constraint(equalTo: navBar.centerYAnchor),

            progressBar.topAnchor.constraint(equalTo: navBar.bottomAnchor),
            progressBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            progressBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            webView.topAnchor.constraint(equalTo: navBar.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])

        // KVO for progress bar
        progressObserver = webView.observe(\.estimatedProgress, options: .new) { [weak self] wv, _ in
            DispatchQueue.main.async {
                let p = Float(wv.estimatedProgress)
                self?.progressBar.setProgress(p, animated: true)
                self?.progressBar.isHidden = p >= 1
            }
        }
    }

    private func loadPortlandForm() {
        let url = URL(string: "https://www.portland.gov/ppd/noise/noise-concerns")!
        webView.load(URLRequest(url: url))
    }

    // MARK: – WKNavigationDelegate

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        injectScript()
    }

    // MARK: – Actions

    @objc private func closeTapped() {
        dismiss(animated: true)
    }

    // MARK: – JavaScript injection

    private func injectScript() {
        webView.evaluateJavaScript(buildScript()) { _, _ in }
    }

    private func s(_ key: String) -> String {
        (formData[key] as? String ?? "")
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "\"", with: "\\\"")
            .replacingOccurrences(of: "\n", with: " ")
    }

    private func buildScript() -> String {
        let firstName  = s("firstName")
        let lastName   = s("lastName")
        let email      = s("email")
        let phone      = s("phone")
        let userAddr   = s("address")
        let locAddr    = s("locationAddress")
        let lat        = formData["locationLat"] as? Double ?? 0
        let lng        = formData["locationLng"] as? Double ?? 0
        let count      = formData["count"] as? Int ?? 1
        let cType      = s("complaintType")
        let equipment  = s("equipment")
        let date       = s("date")
        let time       = s("time")
        let notes      = s("notes")
        let formal     = (formData["formal"] as? Bool ?? true) ? "Yes" : "No"
        let anon       = (formData["anonymous"] as? Bool ?? false) ? "Yes" : "No"
        let latStr     = String(format: "%.5f", lat)
        let lngStr     = String(format: "%.5f", abs(lng))
        let notesLine  = notes.isEmpty ? "" : " Notes: \(s("notes"))"

        let desc = "\(count) gas-powered \(equipment)(s) in use at \(locAddr). \(date) at \(time).\(notesLine) This is a \(formal == "Yes" ? "formal" : "general") complaint."

        return """
        (function () {
          'use strict';

          // ── Floating reference card ──────────────────────────────────────────
          if (!document.getElementById('pdx-ref-card')) {
            const card = document.createElement('div');
            card.id = 'pdx-ref-card';
            card.style.cssText = [
              'position:fixed','bottom:16px','right:12px',
              'background:rgba(20,20,22,0.97)','color:#fff',
              'border-radius:14px','padding:12px 14px',
              'font-family:-apple-system,BlinkMacSystemFont,sans-serif',
              'font-size:12px','z-index:2147483647','max-width:240px',
              'box-shadow:0 6px 28px rgba(0,0,0,0.6)',
              'line-height:1.65','cursor:pointer',
              'border:1px solid rgba(255,255,255,0.12)',
              'transition:all 0.2s'
            ].join(';');

            const rows = [
              ['Name',  '\(firstName) \(lastName)'],
              ['Email', '\(email)'],
              ['Phone', '\(phone)'],
              ['Home',  '\(userAddr)'],
              ['—',     ''],
              ['Where', '\(locAddr)'],
              ['GPS',   '\(latStr)°N \(lngStr)°W'],
              ['What',  '\(count)× \(equipment)'],
              ['Type',  '\(cType)'],
              ['When',  '\(date) \(time)'],
              ['Formal','\(formal)'],
              ['Anon',  '\(anon)'],
            ];

            let open = true;
            function render() {
              const hdr = '<div style="font-weight:700;font-size:13px;margin-bottom:6px;color:#007AFF">📋 Your Info ' + (open ? '▾' : '▸') + '</div>';
              const body = open ? rows.map(r => r[0] === '—'
                ? '<hr style="border:0;border-top:1px solid #3a3a3c;margin:5px 0">'
                : `<div><span style="color:#8e8e93;min-width:42px;display:inline-block">${r[0]}</span> ${r[1]}</div>`
              ).join('') : '';
              card.innerHTML = hdr + body;
            }
            render();
            card.addEventListener('click', () => { open = !open; render(); });
            document.body.appendChild(card);
          }

          // ── Field fill helpers ───────────────────────────────────────────────
          function fillInput(el, val) {
            if (!el || val === '' || val === undefined) return false;
            try {
              const pd = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
              if (pd) pd.set.call(el, val);
              else el.value = val;
            } catch(_) { el.value = val; }
            ['input','change','blur'].forEach(t => el.dispatchEvent(new Event(t, {bubbles:true})));
            return true;
          }

          function fillTextarea(el, val) {
            if (!el || !val) return false;
            try {
              const pd = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
              if (pd) pd.set.call(el, val);
              else el.value = val;
            } catch(_) { el.value = val; }
            ['input','change'].forEach(t => el.dispatchEvent(new Event(t, {bubbles:true})));
            return true;
          }

          function tryFill(selectors, val) {
            for (const sel of selectors) {
              const el = document.querySelector(sel);
              if (fillInput(el, val)) return true;
            }
            return false;
          }

          function tryClick(selectors) {
            for (const sel of selectors) {
              const el = document.querySelector(sel);
              if (el) { el.click(); return true; }
            }
            return false;
          }

          // ── Step 1: Portland residency → click "Yes" ────────────────────────
          tryClick([
            'input[type="radio"][value="Yes"]',
            'input[type="radio"][value="yes"]',
            'input[type="radio"][value="1"]',
            'input[type="radio"][value="true"]',
          ]);

          // ── Personal info (Step 4 fields — try on every page load) ──────────
          tryFill([
            'input[name*="first_name"]','input[id*="first-name"]',
            'input[id*="first_name"]','input[placeholder*="First"]',
            '#edit-first-name','[data-drupal-selector*="first-name"]',
          ], '\(firstName)');

          tryFill([
            'input[name*="last_name"]','input[id*="last-name"]',
            'input[id*="last_name"]','input[placeholder*="Last"]',
            '#edit-last-name','[data-drupal-selector*="last-name"]',
          ], '\(lastName)');

          tryFill([
            'input[type="email"]','input[name*="email"]',
            '#edit-email','input[placeholder*="Email"]',
          ], '\(email)');

          tryFill([
            'input[type="tel"]','input[name*="phone"]',
            'input[name*="telephone"]','#edit-phone',
            'input[placeholder*="Phone"]',
          ], '\(phone)');

          tryFill([
            'input[name*="reporter_address"]','input[name*="your_address"]',
            'input[name*="mailing_address"]','input[placeholder*="Your address"]',
          ], '\(userAddr)');

          // ── Complaint description / notes ────────────────────────────────────
          const textareas = document.querySelectorAll('textarea');
          textareas.forEach(ta => fillTextarea(ta, `\(desc)`));

          tryFill([
            'input[name*="description"]','input[name*="detail"]',
            'input[name*="notes"]','input[name*="comment"]',
          ], '\(desc)');

          // ── Date and time ────────────────────────────────────────────────────
          tryFill([
            'input[type="date"]','input[name*="date"]','input[name*="incident_date"]',
          ], '\(date)');

          tryFill([
            'input[type="time"]','input[name*="time"]','input[name*="incident_time"]',
          ], '\(time)');

          // ── Count / quantity ─────────────────────────────────────────────────
          tryFill([
            'input[name*="count"]','input[name*="quantity"]','input[name*="number"]',
            'input[name*="how_many"]',
          ], '\(count)');

          // ── Formal complaint ─────────────────────────────────────────────────
          if ('\(formal)' === 'Yes') {
            tryClick([
              'input[type="radio"][name*="formal"][value*="yes"]',
              'input[type="radio"][name*="formal"][value*="1"]',
            ]);
          }

          // ── Anonymous ────────────────────────────────────────────────────────
          const anonVal = '\(anon)' === 'Yes';
          tryClick([
            `input[type="radio"][name*="anon"][value="${anonVal ? 'yes' : 'no'}"]`,
            `input[type="checkbox"][name*="anon"]`,
          ]);

          console.log('[PDX Noise] Auto-fill pass complete');
        })();
        """
    }
}
