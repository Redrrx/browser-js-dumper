const DATE_REF = "2024-06-15T12:00:00Z";
const DATE_REF_FORMATS = [
  [{},                                               "default"],
  [{dateStyle: "full",  timeStyle: "long"},           "full_long"],
  [{year: "numeric", month: "2-digit", day: "2-digit"}, "numeric_date"],
  [{weekday: "long", hour: "2-digit", minute: "2-digit"}, "weekday_time"],
];
