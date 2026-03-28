/**
 * Auto Site Logistics (SharePoint) URLs keyed by normalized site/location strings.
 * Keep in sync with trip page site matching behavior.
 */

export function normalizeSiteInfoKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const AUTO_SITE_INFO_LINKS = [
  [["albania elbasan", "elbasan albania", "elbasan"], "https://lst365.sharepoint.com/:w:/g/IQCr0eKDZTeSTrvVTdx2fnWrATYOq_PXdblUVSyqFLGq0DQ?e=VXvq02"],
  [["burnos aires argentina", "buenos aires argentina", "buenos aires", "argentina buenos aires"], "https://lst365.sharepoint.com/:w:/g/IQA4z2RnV8ThT7pEKzEFySxGAVEqe5nGRJX94y5R4YfDfFE?e=6nXVWb"],
  [["vienna", "vienna austria"], "https://lst365.sharepoint.com/:w:/g/IQDxSro6PcVEQq1Vm8zyqXheAX8qSYyTcZGVMx4PdYHQh94?e=ChZHfY"],
  [["florianopolis", "florianopolis brazil"], "https://lst365.sharepoint.com/:w:/g/IQAi_fnDKnrEQbQQ1u2o4Pm_AZoFLTIMUBjCN3edSOt1dfI?e=KOEP8e"],
  [["joao pessoa brazil", "joao pessoa", "joao pessoa paraiba"], "https://lst365.sharepoint.com/:w:/g/IQAi_fnDKnrEQbQQ1u2o4Pm_AZoFLTIMUBjCN3edSOt1dfI?e=KOEP8e"],
  [["ponta grossa brazil", "ponta grossa"], "https://lst365.sharepoint.com/:w:/g/IQDNjLodIRhjTppa_qOmme9LAQnGtuzCX72mE7COPVxaJmo?e=lW1zZv"],
  [["recife brazil", "recife"], "https://lst365.sharepoint.com/:w:/g/IQARreWH2jlZSqXaJp1XXUSgAXe6cHTOLM4ZYaTViCkmhDU?e=vLebLu"],
  [["rio de janeiro", "rio de janeiro brazil", "rio"], "https://lst365.sharepoint.com/:w:/g/IQCsgZaP3lrZRY3W6H61xvjCAW7e57FXNJzPUJzXt1fZm90?e=Iheo9h"],
  [["croatia"], "https://lst365.sharepoint.com/:w:/g/IQCRc3e68vkQTbLBPnukBhozAbUqD_J5sweioU-m2hak8Js?e=H9cwZI"],
  [["hannover germany", "hannover"], "https://lst365.sharepoint.com/:w:/g/IQB3YxIE_HTWQYn0Cd8leS98ASlRPPtW0WtqwpOYVnP4bMc?e=tFdjtV"],
  [["lecce", "lecce italy"], "https://lst365.sharepoint.com/:w:/g/IQB7reWqEGrARpX8MeuXfzy-AW7LHjReu3ddKqyOIY93SA8?e=uo9HFG"],
  [["padova italy", "padova"], "https://lst365.sharepoint.com/:w:/g/IQChsRXtcd1fR4ZgTpk0OROUAXpXDpQJaiX3yOQ6lyVoEaE?e=SHXwre"],
  [["vicenza", "vicenza italy"], "https://lst365.sharepoint.com/:w:/g/IQCM_Yf-3oN4RYOQuYqr_plIAW7IHugXXh0HMYPiZNTtw5o?e=XhMsoM"],
  [["kasama japan", "kasama"], "https://lst365.sharepoint.com/:w:/g/IQBkZ5pFJVAmTZ3r9K5tM6DAAcTduUSfOk3_CqzkjOdkbyY?e=4Xn3vG"],
  [["tokyo japan", "tokyo"], "https://lst365.sharepoint.com/:w:/g/IQD9J2UkIYp9TIHb-lPAy40iAdCqf72iXcoxLXoDJ_VM_-I?e=AISo4N"],
  [["marseille france", "marseille"], "https://lst365.sharepoint.com/:w:/g/IQCIUT87l_VjQ42EX04fvIr8AUN1qvC1useECpVcSHTLKVw?e=OIhzfm"],
  [["krakow poland", "krakow"], "https://lst365.sharepoint.com/:w:/g/IQDdYxW3aFWKS69WTRknVWFKAde4Lx-hMuz7n3axYEPFhv4?e=eOe9j4"],
  [["lodz poland", "lodz"], "https://lst365.sharepoint.com/:w:/g/IQC-jkBrhVkhRKJPLw2WucIdAXalV12z8aXyGaTdhX-6ghg?e=kF41eX"],
  [["pabianice poland", "pabianice"], "https://lst365.sharepoint.com/:w:/g/IQCGgNg98C1mSbDF5LqYtL34AStYJB4QiTTz-Zl8G0oUFeE?e=QHcSLP"],
  [["south korea seoul", "seoul south korea", "seoul korea", "korea seoul", "seoul"], "https://lst365.sharepoint.com/:w:/g/IQDnOTLPfex0RqJG4p6ChdERAZ2WKBJZHw3pzjFk4Om_aHw?e=7oZybD"],
  [["spain murcia alcantarilla", "murcia alcantarilla", "alcantarilla", "murcia"], "https://lst365.sharepoint.com/:w:/g/IQBHLXMUylwVRblNuEp_IfPeAexqrlspqpMj2fE00jyGt6E?e=eVhwsq"],
  [["west springeifld", "west springfield"], "https://lst365.sharepoint.com/:w:/g/IQAhz_L8VEJqR5uqjcsUevrfARar3ZTPt_KAUUJuSFS6xXM?e=sIN60O"],
  [["ecuador tabacundo", "tabacundo", "tabacundo ecuador"], "https://lst365.sharepoint.com/:x:/g/IQA5-MNxcpW0S715lEJe206YAZGC0Uw1e35UpI3gIoJOSoQ?e=Q6qbtu"],
];

const AUTO_SITE_INFO_LINKS_BY_KEY = new Map(
  AUTO_SITE_INFO_LINKS.flatMap(([aliases, url]) =>
    aliases.map((alias) => [normalizeSiteInfoKey(alias), url])
  )
);

/** Direct lookup on full normalized site/location string. */
export function getAutoSiteLogisticsUrl(siteLabelOrLocation) {
  const key = normalizeSiteInfoKey(siteLabelOrLocation);
  return AUTO_SITE_INFO_LINKS_BY_KEY.get(key) || "";
}

/** Try full label, then first comma segment (e.g. city), for SharePoint match. */
export function resolveSiteLogisticsUrl(siteLabelOrLocation) {
  const raw = String(siteLabelOrLocation || "").trim();
  if (!raw) return "";
  let url = getAutoSiteLogisticsUrl(raw);
  if (url) return url;
  const first = raw.split(",")[0].trim();
  if (first && first !== raw) {
    url = getAutoSiteLogisticsUrl(first);
    if (url) return url;
  }
  return "";
}
