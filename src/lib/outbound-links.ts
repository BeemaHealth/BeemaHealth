/**
 * Outbound link policy for citations and partner links.
 *
 * Every citation on a /learn/ page is a real outbound link, and by default an
 * outbound link passes ranking signal to its destination. Linking out to
 * government, academic, and peer-reviewed sources is a positive quality signal
 * and those stay followable on purpose.
 *
 * Commercial destinations are different. Novo Nordisk and Eli Lilly now sell
 * GLP-1 medication direct to consumers through NovoCare Pharmacy and
 * LillyDirect, which makes them competitors for the same searches Beema Health is
 * trying to rank for, not just label publishers. Price-comparison and review
 * sites are commercial too. Those links stay visible and clickable, because
 * removing a citation would be worse than linking to it, but they are marked
 * `nofollow` so Beema Health is not handing ranking signal to a competitor.
 *
 * Answer engines still read nofollow links and their labels, so this costs
 * nothing for AEO.
 */

/**
 * Hosts that publish primary regulatory, government, academic, or
 * peer-reviewed material. Links to these stay followable.
 */
export const FOLLOWABLE_SOURCE_HOSTS: readonly string[] = [
  // Peer-reviewed literature and resolvers
  "doi.org",
  "www.nejm.org",
  "jamanetwork.com",
  "academic.oup.com",
  "dom-pubs.onlinelibrary.wiley.com",
  "pubmed.ncbi.nlm.nih.gov",
  "www.ncbi.nlm.nih.gov",
  "nap.nationalacademies.org",
  // US regulators and federal health agencies
  "www.fda.gov",
  "www.accessdata.fda.gov",
  "dailymed.nlm.nih.gov",
  "medlineplus.gov",
  "www.niddk.nih.gov",
  "www.nccih.nih.gov",
  "www.nimh.nih.gov",
  "www.niaaa.nih.gov",
  "www.nhlbi.nih.gov",
  "www.cancer.gov",
  "ods.od.nih.gov",
  "www.cdc.gov",
  "odphp.health.gov",
  "telehealth.hhs.gov",
  "www.womenshealth.gov",
  "npiregistry.cms.hhs.gov",
  "www.fsis.usda.gov",
  "www.federalregister.gov",
  "www.govinfo.gov",
  "www.tsa.gov",
  // State and local government
  "statutes.capitol.texas.gov",
  "texreg.sos.state.tx.us",
  "publichealth.harriscountytx.gov",
  // Professional and specialty societies
  "www.acog.org",
  "www.aad.org",
  "www.asahq.org",
  "www.thyroid.org",
  "www.auanet.org",
  "www.obesity.org",
  "menopause.org",
  "www.healthinaging.org",
  // Foreign regulator
  "www.nmpa.gov.cn",
];

/**
 * Commercial hosts that are cited on purpose but must not receive ranking
 * signal. Kept explicit so the reason for each is reviewable.
 */
export const NOFOLLOW_COMMERCIAL_HOSTS: readonly string[] = [
  "www.novocare.com", // NovoCare Pharmacy, direct-to-consumer Wegovy seller
  "www.novo-pi.com", // Novo Nordisk prescribing-information host
  "www.novonordiskmedical.com",
  "www.lilly.com", // LillyDirect, direct-to-consumer Zepbound seller
  "pi.lilly.com", // Eli Lilly prescribing-information host
  "medical.lilly.com",
  "investor.lilly.com",
  "www.prnewswire.com", // press-release wire
  "www.goodrx.com", // commercial price comparison
  "www.consumeraffairs.com", // commercial review and lead-generation site
];

function hostOf(href: string): string | null {
  try {
    return new URL(href).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Beema Health's own hosts. Self-links are never nofollowed. */
const OWN_HOSTS: readonly string[] = ["beemahealth.com", "www.beemahealth.com"];

/** True when the destination publishes primary, non-commercial material. */
export function isFollowableSource(href: string): boolean {
  const host = hostOf(href);
  if (host === null) return false;
  return OWN_HOSTS.includes(host) || FOLLOWABLE_SOURCE_HOSTS.includes(host);
}

/**
 * `rel` for an outbound citation link. Primary sources stay followable;
 * everything else, commercial or simply unrecognized, is nofollowed.
 */
export function citationRel(href: string): string {
  return isFollowableSource(href)
    ? "noopener noreferrer"
    : "noopener noreferrer nofollow";
}
