// 成果展示用模擬費率，供消費者試算介面與簡報示例使用。
// 非全國電子正式價目；正式上線時由公司核准費率取代，並與審核郵件共用同一計價規則。
window.DEMO_SERVICE_RATES = {
  mode: "demo",
  version: "DEMO-1",
  effectiveDate: "展示假設",
  fees: {
    install: { ac: 2800, fridge: 800, washer: 700 },
    removal: { ac: 350, fridge: 350, washer: 350 },
    applicationFee: 150,
    distance: { ratePerKm: 15, includedKm: 20, tripMultiplier: 2 },
    floorNoElevator: 100,
    specialWork: 6000,
    tradeInCreditRate: 0.5
  }
};
