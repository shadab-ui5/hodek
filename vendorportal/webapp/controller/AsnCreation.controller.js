sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "hodek/vendorportal/model/models",
    "hodek/vendorportal/utils/Formatter"
], (Controller, Models, Formatter) => {
    "use strict";

    return Controller.extend("hodek.vendorportal.controller.AsnCreation", {
        onInit() {
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteAsnCreation").attachPatternMatched(this._onRouteMatched, this);

        },
        _onRouteMatched: function (oEvent) {
            var sPoNumber = oEvent.getParameter("arguments").po;
            console.log("Routed PO ID:", sPoNumber);
            this.callThirdScreenPo();
        },
        callThirdScreenPo: function () {
            let aPoData;
            let oSelectedPoItems = this.getOwnerComponent().getModel("SelectedPoItemsModel");
            if (oSelectedPoItems) {
                aPoData = oSelectedPoItems.getProperty("/POItems")
            } else {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("RouteVendorPortal");
            }

            const aFilters = [];

            // Create OR filters for the array of input combinations
            aPoData.forEach(obj => {
                const oGroupFilter = new sap.ui.model.Filter({
                    filters: [
                        new sap.ui.model.Filter("Plant", sap.ui.model.FilterOperator.EQ, obj.Plant),
                        new sap.ui.model.Filter("PurchaseOrder", sap.ui.model.FilterOperator.EQ, obj.PurchaseOrder),
                        new sap.ui.model.Filter("PurchaseOrderItem", sap.ui.model.FilterOperator.EQ, obj.PurchaseOrderItem)
                    ],
                    and: true
                });
                aFilters.push(oGroupFilter);
            });

            // Final OR filter group
            const oFinalFilter = new sap.ui.model.Filter({
                filters: aFilters,
                and: false
            });

            // Set busy indicator if needed
            this.getView().setBusy(true);

            Models.fetchAsnItems(this, oFinalFilter)
        },
        onNavBack: function () {
            var oHistory = sap.ui.core.routing.History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                let po=this.getOwnerComponent().getModel("RoutePoData").getProperty("/PoHeader/PurchaseOrder");
                this.getOwnerComponent().getRouter().navTo("RoutePurchaseOrder", {
                    po:po
                }, true); // replace with actual route
            }
        },
        getTransporter: function () {
            this.aTransporterList = [
                { Transporter: "CHOUDHARY ROADLINES" },
                { Transporter: "ARVIND ROADLINES" },
                { Transporter: "BHAGWAT MUTTE" },
                { Transporter: "BHAGWAT TRANSPORT SERVICES" },
                { Transporter: "METEORIC LOGISTICS PVT. LTD" },
                { Transporter: "SANGAM LOGISTIC SERVICES" },
                { Transporter: "CHANDRAKANT MUTHE" },
                { Transporter: "G R LOGISTICS" },
                { Transporter: "G S TRANSPORT CORPORATION" },
                { Transporter: "ARCHANA ROADLINES CORPORTION" },
                { Transporter: "VISHWAMBHAR ARJUN WAGHMARE" },
                { Transporter: "GANESH WANKHEDE" },
                { Transporter: "VRL LOGISTICS LTD" },
                { Transporter: "HARSHADA CRANE SERVICES" }
            ];

            /*let that = this;
            this.f4HelpModel.read("/TransporterF4Help", {
                urlParameters: that.oParameters,
                success: function (oResponse) {
                    that.aTransporterList = oResponse.results;
                },
                error: function (oError) {
                    MessageBox.error("Failed to load transporter list");
                    console.log(oError);
                }
            });*/
        },

        transporterValueHelp: function (oEvent) {
            try {
                let that = this;
                let selectedInput = oEvent.getSource();
                let oCustomListItem = new sap.m.StandardListItem({
                    active: true,
                    title: "{Transporter}"
                });
                /*let oCustomListItem = new sap.m.CustomListItem({
                    active: true,
                    content: [
                        new sap.m.HBox({
                            items: [
                                new sap.m.Label({
                                    text: "{Transporter}"
                                }).addStyleClass("sapMH4FontSize")
                            ]
                        }).addStyleClass("sapUiSmallMargin"),
                    ]
                });*/

                let oSelectDialog = new sap.m.SelectDialog({
                    title: "Select Transporter",
                    noDataText: "No Data",
                    width: "50%",
                    growing: true,
                    growingThreshold: 12,
                    growingScrollToLoad: true,
                    confirm: function (oEvent) {
                        let aContexts = oEvent.getParameter("selectedContexts");
                        if (aContexts.length) {
                            let selectedValue = aContexts.map(function (oContext) {
                                return oContext.getObject();
                            });
                            selectedInput.setValue(selectedValue[0].Transporter);
                        }
                    },
                    liveChange: function (oEvent) {
                        let sValue = oEvent.getParameter("value");
                        var oFilter = new sap.ui.model.Filter("Transporter", sap.ui.model.FilterOperator.Contains, sValue);
                        /*let oFilter = new Filter({
                            filters: [
                                new sap.ui.model.Filter("Transporter", sap.ui.model.FilterOperator.Contains, sValue)
                                new sap.ui.model.Filter("Transporter_Description", sap.ui.model.FilterOperator.Contains, sValue)
                            ]
                        });*/

                        let oBinding = oEvent.getSource().getBinding("items");
                        oBinding.filter(oFilter);
                        //oBinding.filter([oFilter]);
                    }
                });
                let oModel = new sap.ui.model.json.JSONModel();
                oModel.setData({
                    modelData: this.aTransporterList //view.getModel("searchModel").getData().searchModel
                });
                oSelectDialog.setModel(oModel);
                oSelectDialog.bindAggregation("items", "/modelData", oCustomListItem);
                oSelectDialog.open();
            } catch (e) {
                that.getView().setBusy(false);
            }
        },

    });
});