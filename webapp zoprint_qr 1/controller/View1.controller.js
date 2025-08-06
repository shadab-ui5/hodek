sap.ui.define([
    "sap/ui/core/mvc/Controller"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller) {
        "use strict";

        return Controller.extend("zoprintqr.zoprintqr.controller.View1", {
            onInit: function () {
                var that = this;
                sap.ushell.Container.getServiceAsync("UserInfo").then(function (UserInfo) {
                    var loginUser = UserInfo.getId();
                    window.open(`https://INDUSAIR:International:sap-s4hana@${systemHost}-api.s4hana.cloud.sap/sap/bc/ui5_ui5/sap/zprint_qr/index.html?z9556bxnus10cf='${encodeURI(loginUser)}'`, "_self");
                });
            }
        });
    });
