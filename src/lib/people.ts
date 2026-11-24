import type { FamilyMember, Gender, Me, PatientRelationship, Relationship } from "../api/types";

/** userservice family relationship -> hospitalservice booking relationship. */
export function toBookingRelationship(r: Relationship): PatientRelationship {
  switch (r) {
    case "SPOUSE":
      return "SPOUSE";
    case "FATHER":
    case "MOTHER":
      return "PARENT";
    case "SON":
    case "DAUGHTER":
      return "CHILD";
    case "BROTHER":
    case "SISTER":
      return "SIBLING";
    case "GRANDPARENT":
      return "GRANDPARENT";
    case "GRANDCHILD":
      return "GRANDCHILD";
    default:
      return "OTHER";
  }
}

export function ageFrom(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return age;
}

/** A person a booking can be made for: the patient or one of their family members. */
export interface Person {
  key: string; // "self" or family member id
  name: string;
  phone: string;
  email?: string;
  age: number | null;
  gender: Gender | null;
  relationship?: Relationship;
}

export function peopleFrom(me: Me | null, family: FamilyMember[] = []): Person[] {
  const self: Person[] = me
    ? [
        {
          key: "self",
          name: me.profile.fullName,
          phone: me.profile.phone ?? "",
          email: me.profile.email ?? undefined,
          age: me.profile.age ?? ageFrom(me.profile.dateOfBirth),
          gender: me.profile.gender,
        },
      ]
    : [];
  return [
    ...self,
    ...family.map((f) => ({
      key: f.id,
      name: f.fullName,
      phone: f.phone ?? me?.profile.phone ?? "",
      age: f.age ?? ageFrom(f.dateOfBirth),
      gender: f.gender,
      relationship: f.relationship,
    })),
  ];
}
