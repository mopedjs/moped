import UdtName from './UdtName';

export default function getTypeScriptType(udtName: UdtName): string {
  switch (udtName) {
    case UdtName.bpchar:
    case UdtName.char:
    case UdtName.varchar:
    case UdtName.text:
    case UdtName.uuid:
    case UdtName.bytea:
    case UdtName.inet:
    case UdtName.time:
    case UdtName.timetz:
    case UdtName.interval:
    case UdtName.name:
      return 'string';
    case UdtName.int2:
    case UdtName.int4:
    case UdtName.int8:
    case UdtName.float4:
    case UdtName.float8:
    case UdtName.numeric:
    case UdtName.money:
    case UdtName.oid:
      return 'number';
    case UdtName.bool:
      return 'boolean';
    case UdtName.json:
    case UdtName.jsonb:
      return 'any';
    case UdtName.date:
    case UdtName.timestamp:
    case UdtName.timestamptz:
      return 'Date';
    case UdtName._int2:
    case UdtName._int4:
    case UdtName._int8:
    case UdtName._float4:
    case UdtName._float8:
    case UdtName._numeric:
    case UdtName._money:
      return 'Array<number>';
    case UdtName._bool:
      return 'Array<boolean>';
    case UdtName._varchar:
    case UdtName._text:
    case UdtName._uuid:
    case UdtName._bytea:
      return 'Array<string>';
    case UdtName._json:
    case UdtName._jsonb:
      return 'Array<Object>';
    case UdtName._timestamptz:
      return 'Array<Date>';
  }
}
