sap.ui.define([], function () {
    "use strict";
    return {
        formatDateToDDMMYYYY: function (oDate) {
            if (!oDate) return "";

            const date = new Date(oDate);
            const dd = String(date.getDate()).padStart(2, '0');
            const mm = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
            const yyyy = date.getFullYear();

            return `${dd}.${mm}.${yyyy}`;
        }
    };
});