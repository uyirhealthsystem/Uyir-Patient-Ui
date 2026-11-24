import { useState } from "react";
import { Pressable, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import { Ionicons } from "../../../ui/components";
import { colors } from "../../../ui/theme";
import { auth } from "../components/authStyles";

/** Auth-screen password box with a show/hide eye. */
export function PasswordInput({ style, ...props }: TextInputProps & { style?: StyleProp<ViewStyle> }) {
  const [shown, setShown] = useState(false);
  return (
    <View style={style}>
      <TextInput
        placeholderTextColor="#9CA3AF"
        selectionColor={colors.focus}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
        secureTextEntry={!shown}
        style={[auth.input, { paddingRight: 52 }]}
      />
      <Pressable
        onPress={() => setShown(!shown)}
        hitSlop={8}
        accessibilityLabel={shown ? "Hide password" : "Show password"}
        style={{ position: "absolute", right: 6, top: 0, bottom: 0, width: 44, alignItems: "center", justifyContent: "center" }}
      >
        <Ionicons name={shown ? "eye-off-outline" : "eye-outline"} size={22} color={colors.gray} />
      </Pressable>
    </View>
  );
}
