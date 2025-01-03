import { View, Text } from "react-native";

interface Props {
  loadingInfo: string;
}

export default function Loading({ loadingInfo }: Props): JSX.Element {
  return (
    <View>
      <Text>로딩 중...</Text>
      <View>
        <Text>{loadingInfo}</Text>
      </View>
    </View>
  );
}
