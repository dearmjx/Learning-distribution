import type { Activity } from "@/lib/domain/types";

export const ecosystemActivities: Activity[] = [
  {
    id: "ecosystem-food-web-01",
    courseId: "biology-m4",
    unit: "ระบบนิเวศ",
    title: "วิเคราะห์การเปลี่ยนแปลงในสายใยอาหาร",
    adiPhase: "argument",
    prompt:
      "หากจำนวนงูลดลงอย่างมากในระบบนิเวศนี้ จงอธิบายผลกระทบที่น่าจะเกิดขึ้นต่อประชากรหนู พืช และพลังงานในระบบ โดยเขียนเป็น Claim–Evidence–Reasoning",
    context:
      "ระบบตัวอย่างประกอบด้วย หญ้า → ตั๊กแตน → กบ → งู และ หญ้า → หนู → งู โดยพลังงานถ่ายทอดจากผู้ผลิตไปยังผู้บริโภคและลดลงในแต่ละลำดับขั้น",
    rubricDimensions: ["claim", "evidence", "reasoning"],
    peerReviewAllowed: false,
  },
  {
    id: "ecosystem-energy-flow-01",
    courseId: "biology-m4",
    unit: "ระบบนิเวศ",
    title: "อธิบายการไหลของพลังงาน",
    adiPhase: "investigation",
    prompt:
      "เปรียบเทียบพลังงานที่ผู้ผลิตและผู้บริโภคลำดับที่สองได้รับในระบบนิเวศ จงอธิบายโดยใช้หลักฐานจากบทเรียนและเหตุผลเชิงกลไก",
    context:
      "ผู้ผลิตเปลี่ยนพลังงานแสงเป็นพลังงานเคมี ส่วนพลังงานบางส่วนสูญเสียไปเป็นความร้อนเมื่อพลังงานถ่ายทอดระหว่างลำดับขั้นการกิน",
    rubricDimensions: ["claim", "evidence", "reasoning"],
    peerReviewAllowed: true,
  },
];

export function getActivity(activityId: string): Activity | undefined {
  return ecosystemActivities.find((activity) => activity.id === activityId);
}
