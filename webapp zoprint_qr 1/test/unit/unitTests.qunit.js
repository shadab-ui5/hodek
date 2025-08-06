/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"zoprint_qr/zoprint_qr/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
