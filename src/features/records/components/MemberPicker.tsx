import { useFamilyQuery } from "../../profile/api";
import type { FamilyMember } from "../../profile/types";
import { useScreenQuery } from "../../../lib/hooks";
import { humanize } from "../../../ui/components";
import { PersonPicker } from "../../../ui/form";

/** "self" or a family member id. */
export function useFamily() {
  return useScreenQuery(useFamilyQuery());
}

export function MemberPicker({ family, value, onChange, myName = "Me" }: { family: FamilyMember[]; value: string; onChange: (v: string) => void; myName?: string }) {
  if (!family.length) return null;
  return (
    <PersonPicker
      label="Whose records?"
      people={[{ key: "self", name: myName, caption: "You" }, ...family.map((f) => ({ key: f.id, name: f.fullName, caption: humanize(f.relationship) }))]}
      value={value}
      onChange={onChange}
    />
  );
}
