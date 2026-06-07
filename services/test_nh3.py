import nh3

html = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" alt="test" />'

allowed_tags = {"img"}
allowed_attributes = {"img": {"src", "alt"}}

sanitized = nh3.clean(html, tags=allowed_tags, attributes=allowed_attributes, url_schemes={"http", "https", "data"})
print("Sanitized HTML:", sanitized)
