var sUser = "MACPL",
    sPwd = "Marathwada@AutoComponent4India";
var systemHost;
sap.ui.define([
    "sap/ui/core/UIComponent",
    "com/scp/fiori/inwardgateentry/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("com.scp.fiori.inwardgateentry.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            let systemUrl = window.location.href;
            let sHost = systemUrl.split("//")[1];
            systemHost = sHost.slice(0, 8);
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();
        }
    });
});