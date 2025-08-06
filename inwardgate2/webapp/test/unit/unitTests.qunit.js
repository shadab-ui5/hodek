/* global QUnit */
// https://api.qunitjs.com/config/autostart/
QUnit.config.autostart = false;

sap.ui.require([
	"comscpfiori/inward_gate_entry/test/unit/AllTests"
], function (Controller) {
	"use strict";
	QUnit.start();
});