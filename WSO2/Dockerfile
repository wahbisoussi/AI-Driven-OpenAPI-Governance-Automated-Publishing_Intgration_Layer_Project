# 1. Use the official modern replacement for OpenJDK (Eclipse Temurin)
FROM eclipse-temurin:11-jre-focal

# 2. Set environment variables
ENV WORKING_DIRECTORY=/home/wso2carbon
ENV WSO2_SERVER_HOME=${WORKING_DIRECTORY}/wso2am-4.6.0

# 3. Create a user for security
RUN useradd --system --uid 802 -g 0 wso2carbon

# 4. Copy the UNZIPPED folder into the image
# This matches your folder structure in Screenshot (581)
COPY wso2am-4.6.0 ${WSO2_SERVER_HOME}

# 5. Fix permissions
RUN chown -R wso2carbon:0 ${WORKING_DIRECTORY}

USER 802
WORKDIR ${WSO2_SERVER_HOME}

# 6. Memory limit for your 8GB RAM
ENV JVM_MEM_OPTS="-Xms512m -Xmx1024m"

EXPOSE 9443 8243 8280
CMD ["bin/api-manager.sh"]