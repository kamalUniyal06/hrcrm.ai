// fields/fieldRegistry.js

import TextField from "./components/TextField";
import EmailField from "./components/EmailField";
import PhoneField from "./components/PhoneField";
import NumberField from "./components/NumberField";
import CurrencyField from "./components/CurrencyField";
import PercentField from "./components/PercentField";
import TextareaField from "./components/TextareaField";
import UrlField from "./components/UrlField";
import PasswordField from "./components/PasswordField";

import DateField from "./components/DateField";
import DateTimeField from "./components/DateTimeField";
import TimeField from "./components/TimeField";

import BooleanField from "./components/BooleanField";
import SelectField from "./components/SelectField";
import MultiSelectField from "./components/MultiSelectField";

import RelationField from "./components/RelationField";
import UserField from "./components/UserField";
import TagsField from "./components/TagsField";

import ImageField from "./components/ImageField";
import FileField from "./components/FileField";

import JsonField from "./components/JsonField";
import UnknownField from "./components/UnknownField";

const FIELD_REGISTRY = {
    text: TextField,
    string: TextField,

    email: EmailField,
    phone: PhoneField,

    number: NumberField,
    integer: NumberField,
    decimal: NumberField,

    currency: CurrencyField,
    money: CurrencyField,

    percent: PercentField,

    textarea: TextareaField,
    long_text: TextareaField,

    url: UrlField,
    password: PasswordField,

    date: DateField,
    datetime: DateTimeField,
    time: TimeField,

    boolean: BooleanField,
    checkbox: BooleanField,

    select: SelectField,
    dropdown: SelectField,

    multi_select: MultiSelectField,
    multiselect: MultiSelectField,

    relation: RelationField,
    lookup: RelationField,

    user: UserField,
    owner: UserField,

    tags: TagsField,

    image: ImageField,
    avatar: ImageField,

    file: FileField,
    attachment: FileField,

    json: JsonField,

    unknown: UnknownField,
};

export default FIELD_REGISTRY;