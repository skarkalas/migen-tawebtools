<?xml version="1.0" encoding="ISO-8859-1"?>

<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"  xmlns:jn='http://www.json.org'>

<xsl:output method="html" />

<xsl:template match="interactiondata/preamble/conditions/instructions/instruction">

{
	url:"<xsl:value-of select="."/>"
}
	
</xsl:template>

</xsl:stylesheet>