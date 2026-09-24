declare module "geoip-country" {
	type GeoIpCountryResult = { country: string; name?: string } | null;
	const geoip: { lookup(ip: string): GeoIpCountryResult };
	export default geoip;
}
