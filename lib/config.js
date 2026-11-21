export const CFG = {
  minPlayers: 3, maxPlayers: 10,
  roundsOptions: [5, 7, 10], defaultRounds: 7,
  chips: 2,            // เดิมพันได้คนละกี่เหรียญต่อรอบ
  lowOdds: 6,          // ช่อง "ต่ำกว่าทุกคำตอบ"
  maxOdds: 5,          // ช่องคำตอบที่ไกลศูนย์กลางสุดจ่ายสูงสุด
  centerOdds: 2,       // ช่องกลางจ่ายต่ำสุด
  ansBonus: 3,         // โบนัสให้คนที่ตอบใกล้สุด (ไม่เกินเฉลย)
  doubleLast: 2,       // กี่รอบสุดท้ายที่คะแนนคูณสอง
};
