/**
 * @description 스레드 폐기일을 반환하는 함수
 * @param createdAt 스레드 생성 unix 타임
 */
export const getDiscardThreadTime = (createdAt: number): number => {
  const createdDate = new Date(createdAt * 1000); // Unix 타임스탬프는 초단위, JS는 ms 단위

  // 여기를 async storage로 변경하면 사용자별로 원하는 시간대에 폐기 가능
  const fourAM = new Date(
    createdDate.getFullYear(),
    createdDate.getMonth(),
    createdDate.getDate(),
    4,
    0,
    0,
    0
  );

  // createdAt이 오늘 4시 미만이면, 오늘 4시가 폐기일
  // createdAt이 오늘 4시 이상이면, 내일 4시가 폐기일!
  if (createdAt * 1000 < fourAM.getTime()) {
    console.log(
      "스레드가 오늘 오전 4시 이전에 생성되었으므로, 오늘 4시를 넘으면 폐기합니다."
    );
    return fourAM.getTime();
  } else {
    console.log(
      "스레드가 오늘 오전 4시 이후에 생성되었으므로, 내일 4시를 넘으면 폐기합니다."
    );
    fourAM.setDate(fourAM.getDate() + 1);
    return fourAM.getTime();
  }
};
