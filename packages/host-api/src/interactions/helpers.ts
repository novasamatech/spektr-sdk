import type { Codec, StringRecord } from 'scale-ts';
import { Enum, _void } from 'scale-ts';

// common

type FilterStringRecord<T extends Record<string, Codec<any>>> = T extends StringRecord<Codec<any>> ? T : never;

// request

type DefaultVersionedRequestEnum = StringRecord<[request: Codec<any>, response: Codec<any>]>;

type InferVersionedRequest<EnumValues extends DefaultVersionedRequestEnum> = FilterStringRecord<{
  [V in keyof EnumValues]: EnumValues[V][0];
}>;

type InferVersionedResponse<EnumValues extends DefaultVersionedRequestEnum> = FilterStringRecord<{
  [V in keyof EnumValues]: EnumValues[V][1];
}>;

const requestEnum = <EnumValues extends DefaultVersionedRequestEnum>(enumValues: EnumValues) => {
  return Enum(
    Object.fromEntries(
      Object.entries(enumValues).map(([key, value]) => [key, value[0]]),
    ) as InferVersionedRequest<EnumValues>,
  );
};

const responseEnum = <EnumValues extends DefaultVersionedRequestEnum>(enumValues: EnumValues) => {
  return Enum(
    Object.fromEntries(
      Object.entries(enumValues).map(([key, value]) => [key, value[1]]),
    ) as InferVersionedResponse<EnumValues>,
  );
};

export const createVersionedRequest = <Name extends string, EnumValues extends DefaultVersionedRequestEnum>(
  key: Name,
  values: EnumValues,
) => {
  type RequestKey = `${Name}_request`;
  type ResponseKey = `${Name}_response`;
  type Result = Record<RequestKey, ReturnType<typeof requestEnum<EnumValues>>> &
    Record<ResponseKey, ReturnType<typeof responseEnum<EnumValues>>>;

  return {
    [`${key}_request`]: requestEnum(values),
    [`${key}_response`]: responseEnum(values),
  } as Result;
};

// subscription

type DefaultVersionedSubscriptionEnum = StringRecord<[start: Codec<any>, receive: Codec<any>]>;

type InferVersionedStart<EnumValues extends DefaultVersionedSubscriptionEnum> = FilterStringRecord<{
  [V in keyof EnumValues]: EnumValues[V][0];
}>;

type InferVersionedReceive<EnumValues extends DefaultVersionedSubscriptionEnum> = FilterStringRecord<{
  [V in keyof EnumValues]: EnumValues[V][1];
}>;

const startEnum = <EnumValues extends DefaultVersionedSubscriptionEnum>(enumValues: EnumValues) => {
  return Enum(
    Object.fromEntries(
      Object.entries(enumValues).map(([key, value]) => [key, value[0]]),
    ) as InferVersionedStart<EnumValues>,
  );
};

const receiveEnum = <EnumValues extends DefaultVersionedRequestEnum>(enumValues: EnumValues) => {
  return Enum(
    Object.fromEntries(
      Object.entries(enumValues).map(([key, value]) => [key, value[1]]),
    ) as InferVersionedReceive<EnumValues>,
  );
};

export const createVersionedSubscription = <Name extends string, EnumValues extends DefaultVersionedRequestEnum>(
  key: Name,
  values: EnumValues,
) => {
  type StartKey = `${Name}_start`;
  type StopKey = `${Name}_stop`;
  type ReceiveKey = `${Name}_receive`;
  type Result = Record<StartKey, ReturnType<typeof startEnum<EnumValues>>> &
    Record<StopKey, Codec<undefined>> &
    Record<ReceiveKey, ReturnType<typeof receiveEnum<EnumValues>>>;

  return {
    [`${key}_start`]: startEnum(values),
    [`${key}_stop`]: _void,
    [`${key}_receive`]: receiveEnum(values),
  } as Result;
};
