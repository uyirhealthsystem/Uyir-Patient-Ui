import { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { usersApi } from "../../api/endpoints";
import { useAuth } from "../../auth/AuthContext";
import { useAction } from "../../lib/hooks";
import type { AppScreen } from "../../navigation/types";
import { Button, ErrorBox, Panel, Screen } from "../../ui/components";
import { ABOUT_FIELDS, AboutFields, CONTACT_FIELDS, ContactFields, draftFrom, toProfileInput, validateDraft, type DraftErrors } from "./ProfileForm";

const ALL = [...ABOUT_FIELDS, ...CONTACT_FIELDS];

export default function EditProfileScreen({ navigation }: AppScreen<"EditProfile">) {
  const { me, setMe, accountEmail } = useAuth();
  const [draft, setDraft] = useState(() => draftFrom(me?.profile, accountEmail));
  const [errors, setErrors] = useState<DraftErrors>({});
  const { busy, error, run } = useAction();

  const update = (d: typeof draft) => {
    setDraft(d);
    if (Object.keys(errors).length) setErrors(validateDraft(d, ALL, { adult: true }));
  };

  const save = () => {
    const e = validateDraft(draft, ALL, { adult: true });
    setErrors(e);
    if (Object.keys(e).length) return;
    run(async () => {
      // PUT replaces the whole profile; every field is sent.
      const profile = await usersApi.replaceProfile(toProfileInput(draft));
      if (me) setMe({ ...me, profile });
      navigation.goBack();
    });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen footer={<Button title="Save changes" icon="checkmark" onPress={save} loading={busy} />}>
        <Panel title="About you" icon="person-outline">
          <AboutFields draft={draft} onChange={update} errors={errors} />
        </Panel>
        <Panel title="Contact & address" icon="call-outline">
          <ContactFields draft={draft} onChange={update} errors={errors} />
        </Panel>
        {Object.keys(errors).length ? <ErrorBox message="Please fix the highlighted fields." /> : null}
        {error ? <ErrorBox message={error} /> : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
