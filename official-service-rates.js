// 全國電子正式服務費率資料介面。
// 目前尚未取得公司核准價目，請勿填入示範或推估數字。
// 公司提供核准費率後，將 null 替換為以下格式；前台試算與核價郵件應共用同一份版本資料。
//
// window.NATIONWIDE_SERVICE_RATES = {
//   version: "COMPANY-APPROVED-VERSION",
//   effectiveDate: "YYYY-MM-DD",
//   fees: {
//     install: { ac: null, fridge: null, washer: null },
//     removal: { ac: null, fridge: null, washer: null },
//     applicationFee: null,
//     distance: { ratePerKm: null, includedKm: 0, tripMultiplier: 1 },
//     floorNoElevator: null,
//     specialWork: null,
//     tradeInCreditRate: null
//   }
// };

window.NATIONWIDE_SERVICE_RATES = null;
