// Districts Uyir serves (Tamil Nadu + Puducherry), same list as the service
// provider app. Kept local: no PIN codes or addresses are sent to third-party
// lookup services.
export const DISTRICTS_BY_STATE: Record<string, string[]> = {
  "Tamil Nadu": [
    "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kallakurichi",
    "Kancheepuram", "Kanniyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal",
    "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur",
    "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai",
    "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar",
  ],
  Puducherry: ["Puducherry", "Karaikal", "Mahe", "Yanam"],
};

export const DISTRICT_OPTIONS = Object.entries(DISTRICTS_BY_STATE).flatMap(([group, list]) => list.map((value) => ({ group, value })));
