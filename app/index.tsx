import { useChat } from "@/hooks/assistant/useChat";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index(): JSX.Element {
  const { input, chats, handleInputChange, handleInputSubmit } = useChat();

  return (
    <SafeAreaView>
      <Text>API 유효성 검증을 통과했어요.</Text>
      <TextInput
        style={{ height: 40, margin: 12, borderWidth: 1, padding: 10 }}
        onChangeText={handleInputChange}
        value={input}
      />
      <TouchableOpacity
        style={{ height: 40, margin: 12, borderWidth: 1, padding: 10 }}
        onPress={handleInputSubmit}
      >
        <Text>전송</Text>
      </TouchableOpacity>
      {chats.map((chat, idx) => (
        <View key={idx}>
          <Text>
            {chat.role} : {chat.text}
          </Text>
        </View>
      ))}
    </SafeAreaView>
  );
}
