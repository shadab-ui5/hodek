/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */
var systemHost;
sap.ui.define([
        "sap/ui/core/UIComponent",
        "sap/ui/Device",
        "zoprintqr/zoprintqr/model/models"
    ],
    function (UIComponent, Device, models) {
        "use strict";

        return UIComponent.extend("zoprintqr.zoprintqr.Component", {
            metadata: {
                manifest: "json"
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                let systemUrl = window.location.href;
                let sHost = systemUrl.split("//")[1];
                systemHost = sHost.split(".")[0];

                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                // enable routing
                this.getRouter().initialize();

                // set the device model
                this.setModel(models.createDeviceModel(), "device");
            }
        });
    }
);