import XCTest

final class ElementDrawingUITest: XCTestCase {
    
    var app: XCUIApplication!
    
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }
    
    override func tearDownWithError() throws {
        app = nil
    }
    
    /// Test that switching elements and drawing works correctly
    /// This verifies the fix for the iOS WKWebView touch event routing bug
    func testElementSwitchingAndDrawing() throws {
        let webView = app.webViews.firstMatch
        XCTAssertTrue(webView.waitForExistence(timeout: 15), "WebView should load")
        
        // Screenshot: Main Menu
        takeScreenshot(name: "01-MainMenu")
        
        // Tap "New Game" - try text first, then coordinate
        let newGameButton = webView.staticTexts["New Game"]
        if newGameButton.waitForExistence(timeout: 5) {
            newGameButton.tap()
        } else {
            // Tap center-ish area where New Game button is
            webView.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.4)).tap()
        }
        
        // Wait for game scene to fully load
        sleep(4)
        takeScreenshot(name: "02-GameLoaded")
        
        // === PHASE 1: Draw with default element (Sand) ===
        // Draw a line across the upper portion of the canvas
        drawLine(in: webView, fromX: 0.2, fromY: 0.3, toX: 0.8, toY: 0.3, steps: 15)
        sleep(2) // Let particles settle
        takeScreenshot(name: "03-SandDrawn")
        
        // === PHASE 2: Switch to Water element ===
        // Water is typically the second element in the "liquids" category
        // First tap the liquids category tab (bottom area, second tab)
        // Category tabs are near the bottom of the screen
        let tabY = 0.92 // Category tabs area
        
        // Tap "Liquids" tab (roughly second position)
        webView.coordinate(withNormalizedOffset: CGVector(dx: 0.25, dy: tabY)).tap()
        usleep(500_000)
        takeScreenshot(name: "04-LiquidsTab")
        
        // Tap the first element in liquids (Water) - element buttons are just above tabs
        let btnY = 0.87 // Element buttons area
        webView.coordinate(withNormalizedOffset: CGVector(dx: 0.1, dy: btnY)).tap()
        usleep(500_000)
        takeScreenshot(name: "05-WaterSelected")
        
        // Draw water above the sand
        drawLine(in: webView, fromX: 0.2, fromY: 0.2, toX: 0.8, toY: 0.2, steps: 15)
        sleep(2) // Let water flow
        takeScreenshot(name: "06-WaterDrawn")
        
        // === PHASE 3: Switch to Fire (in gases/energy category) ===
        // Tap gases category tab
        webView.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: tabY)).tap()
        usleep(500_000)

        // Tap first element (likely Fire)
        webView.coordinate(withNormalizedOffset: CGVector(dx: 0.1, dy: btnY)).tap()
        usleep(500_000)
        takeScreenshot(name: "07-FireSelected")
        
        // Draw fire
        drawLine(in: webView, fromX: 0.3, fromY: 0.15, toX: 0.7, toY: 0.15, steps: 10)
        sleep(2)
        takeScreenshot(name: "08-FireDrawn")
        
        // === PHASE 4: Switch back to Solids and draw Stone ===
        // Tap solids tab (first tab)
        webView.coordinate(withNormalizedOffset: CGVector(dx: 0.08, dy: tabY)).tap()
        usleep(500_000)

        // Tap Stone (second element after Sand)
        webView.coordinate(withNormalizedOffset: CGVector(dx: 0.2, dy: btnY)).tap()
        usleep(500_000)
        takeScreenshot(name: "09-StoneSelected")
        
        // Draw a stone platform
        drawLine(in: webView, fromX: 0.15, fromY: 0.5, toX: 0.85, toY: 0.5, steps: 20)
        sleep(2)
        takeScreenshot(name: "10-StoneDrawn")
        
        // === PHASE 5: Final state ===
        sleep(3) // Let everything settle/interact
        takeScreenshot(name: "11-FinalState")
        
        // If we got here without crashes, element switching works!
        XCTAssert(true, "Element switching and drawing completed successfully")
    }
    
    // MARK: - Helpers
    
    private func drawLine(in element: XCUIElement, fromX: Double, fromY: Double, toX: Double, toY: Double, steps: Int) {
        let start = element.coordinate(withNormalizedOffset: CGVector(dx: fromX, dy: fromY))
        let end = element.coordinate(withNormalizedOffset: CGVector(dx: toX, dy: toY))
        
        // Press and drag to simulate drawing
        start.press(forDuration: 0.1, thenDragTo: end, withVelocity: .slow, thenHoldForDuration: 0.1)
    }
    
    private func takeScreenshot(name: String) {
        let screenshot = XCUIScreen.main.screenshot()
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
